#!/usr/bin/env python3
"""Upload a sermon MP4 to YouTube, using the shared root uv project and config."""

import argparse
import json
import os
from pathlib import Path
import re
import sys
import tempfile

from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_httplib2 import AuthorizedHttp
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload
import httplib2
from oauthlib.oauth2 import OAuth2Error
from requests.exceptions import RequestException

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from sermon_common import CONFIG_PATH, SermonError, load_config, sermon_date


DIRECTORY = Path(__file__).resolve().parent
SCOPES = ['https://www.googleapis.com/auth/youtube.upload']


def save_private_json(path, value):
    """Atomically replace a local secret/receipt, with owner-only permissions."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=path.name + '.', dir=str(path.parent))
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            json.dump(value, stream, ensure_ascii=False, indent=4)
            stream.write('\n')
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def authenticate(args):
    """Use a saved refresh token, or explicitly authorize the Desktop client."""
    try:
        credentials = None
        if args.token.exists() and not args.reauthorize:
            info = json.loads(args.token.read_text(encoding='utf-8'))
            # Check the recorded scopes rather than relabelling a token with new ones.
            credentials = Credentials.from_authorized_user_info(info)
            if not credentials.has_scopes(SCOPES):
                raise SermonError('Saved token lacks upload permission. Run --auth-only --reauthorize.')
            if not credentials.valid:
                if not credentials.refresh_token:
                    raise SermonError('No refresh token. Run --auth-only --reauthorize.')
                credentials.refresh(Request())
        else:
            if not args.client_secrets.is_file():
                raise SermonError('Missing Desktop OAuth JSON: {}. Download it from Google Auth Platform → Clients.'
                                  .format(args.client_secrets))
            config = json.loads(args.client_secrets.read_text(encoding='utf-8-sig'))
            installed = config.get('installed', {})
            if (not installed.get('client_id') or not installed.get('client_secret')
                    or installed.get('auth_uri') != 'https://accounts.google.com/o/oauth2/auth'
                    or installed.get('token_uri') != 'https://oauth2.googleapis.com/token'):
                raise SermonError('Expected an unmodified Google Desktop app OAuth credentials JSON.')
            flow = InstalledAppFlow.from_client_config(config, SCOPES)
            credentials = flow.run_local_server(
                host='localhost', bind_addr='127.0.0.1', port=0,
                open_browser=not args.no_browser, timeout_seconds=300,
                access_type='offline', prompt='consent',
                authorization_prompt_message='Authorize the intended YouTube channel in your browser:\n{url}',
            )
        if not credentials.refresh_token:
            raise SermonError('Google did not return a refresh token. Run --auth-only --reauthorize.')
        save_private_json(args.token, json.loads(credentials.to_json()))
        return credentials
    except SermonError:
        raise
    except (GoogleAuthError, OAuth2Error, RequestException, OSError, ValueError,
            KeyError, TypeError, AttributeError) as error:
        # OAuth/library diagnostics can contain authorization codes or tokens.
        raise SermonError('OAuth authorization/refresh failed. Check your credentials, test-user access, '
                          'and network; then run --auth-only --reauthorize. Testing-mode refresh tokens '
                          'normally expire after seven days. No credentials were printed.') from error


def build_video(args, config):
    title = args.title if args.title is not None else config.get('title', '')
    speaker = args.speaker if args.speaker is not None else config.get('speaker', '')
    if not args.date or not title.strip() or not speaker.strip():
        raise SermonError('Upload/preview requires --date, title, and speaker (CLI or shared YAML).')
    if not args.file or not args.file.is_file() or args.file.stat().st_size == 0:
        raise SermonError('--file must be an existing, non-empty local MP4 file.')
    if args.file.suffix.lower() != '.mp4':
        raise SermonError('--file must have an .mp4 extension; use the raw or compressed sermon video.')
    video_title = '{}--{} | {}'.format(title.strip(), args.date.strftime('%Y%m%d'), speaker.strip())
    if len(video_title) > 100 or any(char in video_title for char in '<>\r\n'):
        raise SermonError('YouTube title including date/speaker must be at most 100 characters, '
                          'without angle brackets or newlines.')
    lines = [args.date.isoformat(), title.strip(), '講員：' + speaker.strip()]
    if args.scripture:
        lines.extend(['', args.scripture.strip()])
    if args.description_file:
        lines.extend(['', args.description_file.read_text(encoding='utf-8-sig').strip()])
    description = '\n'.join(lines)
    if len(description.encode('utf-8')) > 5000 or any(char in description for char in '<>'):
        raise SermonError('YouTube description must be at most 5000 UTF-8 bytes, without angle brackets.')
    if not re.fullmatch(r'[1-9][0-9]*', args.category_id):
        raise SermonError('--category-id must be a positive numeric YouTube category ID (not a Wix UUID).')
    return {
        'snippet': {
            'title': video_title, 'description': description, 'categoryId': args.category_id,
        },
        'status': {
            'privacyStatus': args.privacy,
            'selfDeclaredMadeForKids': args.made_for_kids,
        },
    }


def reserve_upload(path, args, video):
    """One local upload per date; retain pending records after ambiguous failures."""
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError as error:
        raise SermonError('An upload receipt already exists for this date: {}. Check YouTube Studio '
                          'and the receipt before retrying; no upload was started.'.format(path)) from error
    record = {
        'state': 'pending', 'date': args.date.isoformat(),
        'file': str(args.file.resolve()), 'video': video,
    }
    with os.fdopen(fd, 'w', encoding='utf-8') as stream:
        json.dump(record, stream, ensure_ascii=False, indent=4)
    return record


def upload(service, args, video):
    media = MediaFileUpload(str(args.file), mimetype='video/mp4', chunksize=8 * 1024 * 1024, resumable=True)
    try:
        request = service.videos().insert(part='snippet,status', body=video, media_body=media,
                                          notifySubscribers=False)
        response = None
        while response is None:
            status, response = request.next_chunk(num_retries=0)
            if status:
                print('Upload: {:.0%}'.format(status.progress()), file=sys.stderr)
        video_id = response.get('id', '')
        if not re.fullmatch(r'[A-Za-z0-9_-]+', video_id):
            raise SermonError('YouTube returned no valid video ID. Check YouTube Studio before retrying.')
        return {'id': video_id, 'url': 'https://www.youtube.com/watch?v=' + video_id,
                'privacy': response.get('status', {}).get('privacyStatus', args.privacy)}
    finally:
        media.stream().close()


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    mode = result.add_mutually_exclusive_group(required=True)
    mode.add_argument('--dry-run', action='store_true', help='Preview offline; no OAuth or YouTube requests')
    mode.add_argument('--auth-only', action='store_true', help='Authorize/refresh locally without uploading')
    mode.add_argument('--upload', action='store_true', help='Actually upload the selected file')
    result.add_argument('--config', type=Path, default=CONFIG_PATH)
    result.add_argument('--date', type=sermon_date, help='Sermon date in YYYYMMDD format')
    result.add_argument('--file', type=Path, help='Local sermon MP4 (raw or compressed)')
    result.add_argument('--title', help='Override shared YAML title')
    result.add_argument('--speaker', help='Override shared YAML speaker')
    result.add_argument('--scripture', help='Optional Scripture reference')
    result.add_argument('--description-file', type=Path, help='Append UTF-8 text to the description')
    result.add_argument('--privacy', choices=('private', 'unlisted', 'public'), default='private')
    result.add_argument('--category-id', default='29', help='YouTube category ID (default: 29, Nonprofits & Activism)')
    result.add_argument('--made-for-kids', action='store_true', help='Declare this video made for kids (default: false)')
    result.add_argument('--client-secrets', type=Path, default=DIRECTORY / 'client_secret.local.json')
    result.add_argument('--token', type=Path, default=DIRECTORY / 'token.local.json')
    result.add_argument('--state-dir', type=Path, default=DIRECTORY / '.uploads')
    result.add_argument('--no-browser', action='store_true', help='Print sign-in URL instead of opening a browser')
    result.add_argument('--reauthorize', action='store_true', help='Replace saved authorization; requires --auth-only')
    return result


def run(args):
    if args.reauthorize and not args.auth_only:
        raise SermonError('--reauthorize requires --auth-only; no upload was started.')
    if args.auth_only:
        authenticate(args)
        print('Authorization saved to {}. No video was uploaded.'.format(args.token))
        return
    video = build_video(args, load_config(args.config))
    if args.dry_run:
        print(json.dumps({'file': str(args.file.resolve()), 'video': video,
                          'notifySubscribers': False}, ensure_ascii=False, indent=4))
        return
    receipt = args.state_dir / (args.date.strftime('%Y%m%d') + '.json')
    if receipt.exists():
        raise SermonError('An upload receipt already exists: {}. Check it and YouTube Studio before retrying.'
                          .format(receipt))
    credentials = authenticate(args)
    service = build('youtube', 'v3', cache_discovery=False, static_discovery=True,
                    http=AuthorizedHttp(credentials, http=httplib2.Http(timeout=60)))
    try:
        record = reserve_upload(receipt, args, video)
        try:
            result = upload(service, args, video)
            # Print before saving, so an unwritable disk cannot hide a successful upload.
            print(json.dumps(result, ensure_ascii=False), flush=True)
            record.update({'state': 'completed', 'result': result})
            save_private_json(receipt, record)
        except Exception:
            print('Upload did not finish cleanly. Check YouTube Studio before retrying. '
                  'The receipt is retained at {}. Do not delete it until you have checked for an existing video.'
                  .format(receipt), file=sys.stderr)
            raise
    finally:
        service.close()


def main(argv=None):
    args = parser().parse_args(argv)
    try:
        run(args)
    except SermonError as error:
        print('Error: ' + str(error), file=sys.stderr)
        return 1
    except HttpError as error:
        print('Error: YouTube HTTP {}. Check API access, quota, channel permissions, and YouTube Studio '
              'before rerunning. No automatic retry was made.'.format(error.resp.status), file=sys.stderr)
        return 1
    except (GoogleAuthError, httplib2.HttpLib2Error, OSError, ValueError, KeyError, TypeError) as error:
        # Do not expose credential-bearing requests or responses in diagnostics.
        print('Error: {} during authorization/upload. Check local files, network, and YouTube Studio '
              'before retrying. No automatic retry was made.'.format(type(error).__name__), file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print('\nCancelled. If an upload started, check YouTube Studio and the local receipt before retrying.',
              file=sys.stderr)
        return 130
    return 0


if __name__ == '__main__':
    sys.exit(main())
