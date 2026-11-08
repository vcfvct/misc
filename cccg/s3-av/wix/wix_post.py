#!/usr/bin/env python3
"""Create Sunday sermon drafts using the Wix REST API (PyYAML for YAML config)."""

import argparse
import json
import os
from pathlib import Path
import re
import shlex
import sys
import urllib.error
import urllib.parse
import urllib.request
import unicodedata
import uuid


SITE_ID = 'd3e23eb0-5924-40a9-b990-daa4f82cd0ee'
API_BASE = 'https://www.wixapis.com'
MEDIA_BASE = 'https://cccg-media.s3.amazonaws.com'


# Allow direct execution while sharing validation with the YouTube tool.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from sermon_common import CONFIG_PATH, SermonError as PostError, load_config, sermon_date


def guid(value):
    try:
        return str(uuid.UUID(value))
    except (ValueError, AttributeError) as error:
        raise PostError('Site, author, category, and draft IDs must be valid UUIDs.') from error


def http_url(value):
    try:
        parsed = urllib.parse.urlsplit(value)
        valid = (parsed.scheme in ('https', 'http') and parsed.hostname
                 and not parsed.username and not parsed.password
                 and not any(char.isspace() for char in value))
    except ValueError:
        valid = False
    if not valid:
        raise PostError('Expected an absolute HTTP(S) URL without credentials: ' + value)
    return value


class NoRedirect(urllib.request.HTTPRedirectHandler):
    # Never forward the API key to a redirected URL.
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class WixClient:
    def __init__(self, site_id, api_key):
        self.site_id = guid(site_id)
        self.api_key = api_key.strip()
        if not self.api_key or any(c in self.api_key for c in '\r\n'):
            raise PostError('Set WIX_API_KEY or wixApiKey in .sermon.local.yaml first.')
        self.opener = urllib.request.build_opener(NoRedirect())

    def request(self, method, path, payload=None):
        data = None if payload is None else json.dumps(payload, ensure_ascii=False).encode('utf-8')
        request = urllib.request.Request(API_BASE + path, data=data, method=method, headers={
            'Authorization': self.api_key,
            'wix-site-id': self.site_id,
            'Content-Type': 'application/json',
        })
        try:
            with self.opener.open(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            try:
                detail = error.read().decode('utf-8', errors='replace').replace(self.api_key, '[REDACTED]')
            finally:
                error.close()
            hint = ''
            if error.code in (401, 403):
                hint = ' Check the key, site access, and Blog permissions (including Read Draft Blog Posts).'
            raise PostError('Wix HTTP {}.{} {}'.format(error.code, hint, detail[:1500])) from error
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
            raise PostError(
                'Wix request failed or returned an invalid response. No automatic retry was made. '
                'If this happened during create/publish, check the Wix dashboard before rerunning. '
                + str(error).replace(self.api_key, '[REDACTED]')
            ) from error

    def categories(self):
        offset = 0
        while True:
            path = '/blog/v3/categories?' + urllib.parse.urlencode({
                'paging.limit': 100, 'paging.offset': offset,
            })
            page = self.request('GET', path).get('categories', [])
            yield from page
            if len(page) < 100:
                return
            offset += len(page)

    def members(self):
        offset = 0
        while True:
            result = self.request('POST', '/members/v1/members/query', {
                'query': {'paging': {'limit': 100, 'offset': offset}},
                'fieldsets': ['PUBLIC'],
            })
            page = result['members']
            yield from page
            if len(page) < 100:
                return
            offset += len(page)

    def inspect_post(self, url):
        parsed = urllib.parse.urlsplit(http_url(url))
        if '/post/' not in parsed.path:
            raise PostError('Expected an existing Wix Blog URL containing /post/.')
        slug = urllib.parse.unquote(parsed.path.split('/post/', 1)[1].rstrip('/'))
        if not slug:
            raise PostError('The post URL has no slug.')
        path = '/v3/posts/slugs/' + urllib.parse.quote(slug, safe='')
        return self.request('GET', path)['post']

    def check_duplicates(self, post):
        # Slug is date-based, so changing a title won't create a second sermon that Sunday.
        published = self.request('POST', '/v3/posts/query', {'query': {
            'filter': {'$or': [{'slug': post['seoSlug']}, {'title': post['title']}]},
            'cursorPaging': {'limit': 1},
        }}).get('posts', [])
        if published:
            raise PostError('A matching published post already exists: ' + published[0]['id'])
        # seoSlug isn't a supported draft query filter; inspect all pages instead.
        cursor = None
        seen = set()
        while True:
            paging = {'limit': 100}
            if cursor:
                paging['cursor'] = cursor
            result = self.request('POST', '/blog/v3/draft-posts/query', {
                'query': {'cursorPaging': paging},
            })
            for draft in result.get('draftPosts', []):
                if draft.get('seoSlug') == post['seoSlug'] or draft.get('title') == post['title']:
                    raise PostError(
                        'A matching draft already exists: {}. Review it in Wix, or publish it with '
                        '--publish --publish-draft {}. No new post was created.'.format(draft['id'], draft['id'])
                    )
            cursor = result.get('pagingMetadata', {}).get('cursors', {}).get('next')
            if not cursor:
                return
            if cursor in seen:
                raise PostError('Wix returned a repeated paging cursor; duplicate check could not finish.')
            seen.add(cursor)

    def publish(self, draft_id):
        return self.request('POST', '/blog/v3/draft-posts/{}/publish'.format(guid(draft_id)))


def normalized_name(value):
    return ''.join(unicodedata.normalize('NFKC', value).split()).casefold()


def resolve_author(client, speaker, default_id=None):
    members = list(client.members())
    matches = [member for member in members
               if member.get('profile', {}).get('nickname') == speaker]
    if not matches:
        matches = [member for member in members
                   if normalized_name(member.get('profile', {}).get('nickname', ''))
                   == normalized_name(speaker)]
    # Deduplicate by identity in case the API returns a member on multiple pages.
    matches = {guid(member['id']): member for member in matches}
    if len(matches) > 1:
        raise PostError('Multiple Wix members match speaker {!r}. Use --author-id to choose; '
                        'no default was selected.'.format(speaker))
    if matches:
        author_id, member = next(iter(matches.items()))
        print('Author: {} ({}); matched speaker {!r}.'.format(
            member['profile']['nickname'], author_id, speaker), file=sys.stderr)
        return author_id
    if default_id:
        author_id = guid(default_id)
        print('Author fallback: no Wix member matches speaker {!r}; using default author ID {}.'
              .format(speaker, author_id), file=sys.stderr)
        return author_id
    raise PostError('No Wix member matches speaker {!r} and no default author is configured. '
                    'Set authorId in YAML or use --author-id / WIX_AUTHOR_ID.'.format(speaker))


def paragraph(text, index, link=None, heading=False):
    decorations = []
    if link:
        decorations.append({'type': 'LINK', 'linkData': {'link': {
            'url': http_url(link), 'target': 'BLANK',
        }}})
    node = {
        'type': 'HEADING' if heading else 'PARAGRAPH',
        'id': 'sermon-{}'.format(index),
        'nodes': [{'type': 'TEXT', 'id': '', 'nodes': [], 'textData': {
            'text': text, 'decorations': decorations,
        }}],
    }
    node['headingData' if heading else 'paragraphData'] = {'level': 2} if heading else {}
    return node


def youtube_video(url, index):
    return {
        'type': 'VIDEO',
        'id': 'sermon-{}'.format(index),
        'nodes': [],
        'videoData': {
            'containerData': {
                'width': {'size': 'CONTENT'}, 'alignment': 'CENTER', 'textWrap': True,
            },
            'video': {'src': {'url': http_url(url)}},
        },
    }


def download_button(text, url, index, alignment):
    # Match the reference post: original-width buttons floated left/right.
    is_audio = alignment == 'RIGHT'
    return {
        'type': 'BUTTON',
        'id': 'sermon-{}'.format(index),
        'nodes': [],
        'buttonData': {
            'containerData': {
                'width': {'size': 'ORIGINAL'}, 'alignment': alignment, 'textWrap': True,
            },
            'type': 'LINK',
            'styles': {'borderRadius': 2} if is_audio else {'borderWidth': 0, 'borderRadius': 0},
            'text': text,
            'link': {
                'url': http_url(url), 'target': 'TOP' if is_audio else 'BLANK',
                'rel': {'nofollow': is_audio, 'sponsored': False},
            },
        },
    }


def cover_media(args, title):
    if args.cover_image_url is None and args.cover_image_id is None:
        if args.cover_image_alt is not None:
            raise PostError('--cover-image-alt requires --cover-image-url or --cover-image-id.')
        return None
    if args.cover_image_url is not None:
        url = http_url(args.cover_image_url)
        parsed = urllib.parse.urlsplit(url)
        if (parsed.scheme != 'https' or parsed.hostname != 'static.wixstatic.com'
                or not parsed.path.startswith('/media/') or not parsed.path[len('/media/'):]):
            raise PostError('--cover-image-url must be a direct HTTPS Wix image URL '
                            '(https://static.wixstatic.com/media/...), not a page or wix:image:// reference.')
        # Blog cover media binds to an existing Wix file by ID, not its CDN URL.
        # Ignore CDN transforms (/v1/...), query parameters, and fragments.
        image_id = parsed.path[len('/media/'):].split('/', 1)[0]
    else:
        image_id = args.cover_image_id.strip()
    if not re.fullmatch(r'[A-Za-z0-9_.~%-]+', image_id) or image_id in ('.', '..'):
        raise PostError('Cover image must identify a Wix Media image file, not a URL or path.')
    image = {'id': image_id}
    alt = title if args.cover_image_alt is None else args.cover_image_alt.strip()
    if not 1 <= len(alt) <= 1000:
        raise PostError('Cover image alt text must be between 1 and 1000 characters.')
    return {'wixMedia': {'image': image}, 'custom': True, 'displayed': True, 'altText': alt}


def build_post(args, author_id=None, category_id=None):
    title = args.title.strip()
    speaker = args.speaker.strip()
    if not title or not speaker:
        raise PostError('Title and speaker cannot be blank.')
    date = args.date.strftime('%Y%m%d')
    youtube = http_url(args.youtube)
    host = urllib.parse.urlsplit(youtube).hostname.lower()
    if host not in ('youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'):
        raise PostError('--youtube must be a youtube.com or youtu.be URL.')
    base = http_url(args.media_base_url).rstrip('/')
    video = http_url(args.video_url) if args.video_url else '{}/videos/sermon/{}/{}.mp4'.format(base, date[:4], date)
    audio = http_url(args.audio_url) if args.audio_url else '{}/audio/sermon/{}/{}.mp3'.format(base, date[:4], date)
    nodes = []

    def add(text, link=None, heading=False):
        nodes.append(paragraph(text, len(nodes), link, heading))

    add('{} {}  {}'.format(args.date.isoformat(), title, speaker), heading=True)
    nodes.append(youtube_video(youtube, len(nodes)))
    add('')
    nodes.append(download_button('下载视频', video, len(nodes), 'LEFT'))
    nodes.append(download_button('下载音频', audio, len(nodes), 'RIGHT'))
    add('')
    add('')
    if args.scripture:
        add(args.scripture.strip(), heading=True)
    if args.passage_file:
        passage = args.passage_file.read_text(encoding='utf-8-sig')
        for line in passage.splitlines():
            if line.strip():
                add(line.strip())
    post = {
        'title': '{}--{}'.format(title, date),
        'seoSlug': 'sermon-' + date,
        'commentingEnabled': False,
        'richContent': {'nodes': nodes},
    }
    media = cover_media(args, title)
    if media is not None:
        post['media'] = media
    if len(post['title']) > 200:
        raise PostError('Title including the date must be at most 200 characters.')
    if author_id:
        post['memberId'] = guid(author_id)
    if category_id:
        post['categoryIds'] = [guid(category_id)]
    if len(json.dumps(post, ensure_ascii=False).encode('utf-8')) > 390000:
        raise PostError('Post is too large for Wix (400KB limit). Shorten the passage.')
    return post


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument('--config', type=Path, default=CONFIG_PATH, help='Local YAML config path')
    result.add_argument('--site-id', help='Override WIX_SITE_ID / configured site')
    mode = result.add_mutually_exclusive_group()
    mode.add_argument('--inspect-post', metavar='URL', help='Read a post to find its author/category IDs')
    mode.add_argument('--list-categories', action='store_true', help='List Blog category labels and IDs')
    mode.add_argument('--publish-draft', metavar='ID', help='Publish an existing draft; also requires --publish')
    result.add_argument('--date', type=sermon_date, help='Sermon date, YYYYMMDD')
    result.add_argument('--title', help='Sermon title; overrides YAML title')
    result.add_argument('--speaker', help='Speaker name for display and author lookup; overrides YAML speaker')
    result.add_argument('--scripture', help='Scripture reference, e.g. 羅馬書 3:21–26')
    result.add_argument('--youtube', help='YouTube URL (timestamps are preserved)')
    result.add_argument('--passage-file', type=Path, help='UTF-8 passage text, one paragraph per line')
    result.add_argument('--author-id', help='Explicit Wix Blog author member ID; skips speaker lookup')
    result.add_argument('--category-id', help='Existing Blog category ID')
    result.add_argument('--category', default='主日信息', help='Category label to resolve if no ID is supplied')
    result.add_argument('--media-base-url', default=MEDIA_BASE, help='Public media origin, without path prefix')
    result.add_argument('--video-url', help='Override the generated S3 video URL')
    result.add_argument('--audio-url', help='Override the generated S3 audio URL')
    cover = result.add_mutually_exclusive_group()
    cover.add_argument('--cover-image-url', help='Direct HTTPS image URL from Wix Media Manager')
    cover.add_argument('--cover-image-id', help='Existing Wix Media image ID (not a UUID author ID)')
    result.add_argument('--cover-image-alt', help='Cover image alt text; defaults to the sermon title')
    result.add_argument('--dry-run', action='store_true', help='Print payload offline; no key or author required')
    result.add_argument('--publish', action='store_true', help='Publish immediately (default: draft only)')
    return result


def run(args):
    config = load_config(args.config)
    site_id = guid(args.site_id or os.environ.get('WIX_SITE_ID') or config.get('siteId') or SITE_ID)
    api_key = os.environ.get('WIX_API_KEY') or config.get('wixApiKey', '')
    explicit_author_id = args.author_id or os.environ.get('WIX_AUTHOR_ID')
    default_author_id = config.get('authorId')
    author_id = explicit_author_id or default_author_id
    category_id = args.category_id or os.environ.get('WIX_CATEGORY_ID') or config.get('categoryId')
    utility_mode = args.inspect_post or args.list_categories or args.publish_draft
    if utility_mode:
        if args.dry_run or (args.publish and not args.publish_draft):
            raise PostError('--dry-run/--publish cannot be combined with read-only lookup commands.')
        if args.publish_draft and not args.publish:
            raise PostError('--publish-draft requires --publish to confirm publication.')
        client = WixClient(site_id, api_key)
        if args.inspect_post:
            post = client.inspect_post(args.inspect_post)
            print(json.dumps({key: post.get(key) for key in (
                'id', 'title', 'memberId', 'categoryIds', 'slug',
            )}, ensure_ascii=False, indent=4))
        elif args.list_categories:
            print(json.dumps(list(client.categories()), ensure_ascii=False, indent=4))
        else:
            result = client.publish(args.publish_draft)
            print('Published post ID: ' + result['postId'])
        return
    args.title = args.title if args.title is not None else config.get('title')
    args.speaker = args.speaker if args.speaker is not None else config.get('speaker')
    missing = [name for name in ('date', 'title', 'speaker', 'youtube') if not getattr(args, name)]
    if missing:
        raise PostError('Missing required arguments: ' + ', '.join('--' + name for name in missing))
    if args.dry_run and args.publish:
        raise PostError('Choose --dry-run or --publish, not both.')
    post = build_post(args, author_id, category_id)
    if args.dry_run:
        print('Offline preview only; no requests made. Author/category IDs may still need resolving.', file=sys.stderr)
        if explicit_author_id:
            print('Author: explicit ID {} (lookup skipped).'.format(post['memberId']), file=sys.stderr)
        else:
            print('Speaker author lookup deferred until a live run. Preview default author ID: {} '
                  '(provisional).'.format(post.get('memberId', 'not configured')), file=sys.stderr)
        print(json.dumps({'draftPost': post, 'fieldsets': ['URL']}, ensure_ascii=False, indent=4))
        return
    client = WixClient(site_id, api_key)
    if explicit_author_id:
        print('Author: explicit ID {} (lookup skipped).'.format(post['memberId']), file=sys.stderr)
    else:
        post['memberId'] = resolve_author(client, args.speaker.strip(), default_author_id)
    categories = list(client.categories())
    if category_id:
        if not any(c.get('id') == post['categoryIds'][0] for c in categories):
            raise PostError('The category ID does not exist on this site. Use --list-categories.')
    else:
        matches = [c for c in categories if c.get('label') == args.category]
        if len(matches) != 1:
            raise PostError('Category label must match exactly one category. Use --list-categories and --category-id.')
        post['categoryIds'] = [guid(matches[0]['id'])]
    client.check_duplicates(post)
    result = client.request('POST', '/blog/v3/draft-posts', {'draftPost': post, 'fieldsets': ['URL']})
    draft = result['draftPost']
    print('Created draft ID: ' + draft['id'], flush=True)
    print('Review the draft in Wix Dashboard → Blog → Drafts.', flush=True)
    if args.publish:
        # Print the draft ID before attempting publish so a failure is recoverable.
        published = client.publish(draft['id'])
        print('Published post ID: ' + published['postId'])
    else:
        print('Nothing was published. To publish this draft later:\n'
              '{} --publish --publish-draft {}'.format(
                  shlex.quote(str(Path(__file__).resolve().with_name('wix-post.sh'))), draft['id']))


def main(argv=None):
    args = parser().parse_args(argv)
    try:
        run(args)
    except (PostError, OSError, ValueError, KeyError, TypeError) as error:
        print('Error: ' + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
