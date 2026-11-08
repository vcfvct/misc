"""Offline tests; no Google authorization, uploads, or real credentials."""

import contextlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from google.auth.exceptions import RefreshError
from googleapiclient.errors import HttpError

import youtube_upload as yt


class YouTubeUploadTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.video = self.root / '20261018.mp4'
        self.video.write_bytes(b'test video')
        self.config = self.root / 'config.yaml'
        self.config.write_text('title: 因信称义\nspeaker: 許健文長老\nwixApiKey: secret-wix-key\n', encoding='utf-8')
        self.base = ['--config', str(self.config), '--date', '20261018', '--file', str(self.video),
                     '--token', str(self.root / 'token.json'), '--state-dir', str(self.root / 'receipts')]
        self.args = yt.parser().parse_args(self.base + ['--upload'])

    def payload(self):
        return yt.build_video(self.args, yt.load_config(self.config))

    def test_shared_config_and_private_defaults(self):
        video = self.payload()
        self.assertEqual(video['snippet']['title'], '因信称义--20261018 | 許健文長老')
        self.assertEqual(video['snippet']['description'], '2026-10-18\n因信称义\n講員：許健文長老')
        self.assertEqual(video['snippet']['categoryId'], '29')
        self.assertEqual(video['status'], {'privacyStatus': 'private', 'selfDeclaredMadeForKids': False})
        self.assertNotIn('secret-wix-key', json.dumps(video))

    def test_overrides_and_description(self):
        description = self.root / 'description.txt'
        description.write_text('\ufeff附加说明', encoding='utf-8')
        self.args.title = '另一个标题'
        self.args.speaker = '講員'
        self.args.scripture = '羅馬書 3:21–26'
        self.args.description_file = description
        self.args.privacy = 'unlisted'
        self.args.made_for_kids = True
        video = self.payload()
        self.assertEqual(video['snippet']['title'], '另一个标题--20261018 | 講員')
        self.assertTrue(video['snippet']['description'].endswith('羅馬書 3:21–26\n\n附加说明'))
        self.assertEqual(video['status']['privacyStatus'], 'unlisted')
        self.assertTrue(video['status']['selfDeclaredMadeForKids'])

    @patch.object(yt, 'build')
    @patch.object(yt, 'authenticate')
    def test_dry_run_never_authorizes_or_writes(self, authenticate, build):
        self.args.upload = False
        self.args.dry_run = True
        with contextlib.redirect_stdout(io.StringIO()) as output:
            yt.run(self.args)
        result = json.loads(output.getvalue())
        self.assertEqual(result['video'], self.payload())
        self.assertFalse(result['notifySubscribers'])
        self.assertNotIn('secret-wix-key', output.getvalue())
        authenticate.assert_not_called()
        build.assert_not_called()
        self.assertFalse(self.args.state_dir.exists())
        self.assertFalse(self.args.token.exists())

    def test_validation(self):
        for field, value in [('date', None), ('title', ''), ('title', ' '), ('speaker', ''),
                             ('title', 'x' * 100), ('title', '<bad>'), ('title', 'bad\nline'),
                             ('category_id', 'uuid'), ('category_id', '0'), ('file', None),
                             ('file', self.root / 'missing.mp4')]:
            with self.subTest(field=field, value=value):
                args = yt.parser().parse_args(self.base + ['--upload'])
                setattr(args, field, value)
                with self.assertRaises(yt.SermonError):
                    yt.build_video(args, yt.load_config(self.config))
        self.video.write_bytes(b'')
        with self.assertRaises(yt.SermonError):
            self.payload()
        self.video.write_bytes(b'video')
        other = self.root / 'wrong.mp3'
        other.write_bytes(b'audio')
        self.args.file = other
        with self.assertRaises(yt.SermonError):
            self.payload()

    def test_description_limits(self):
        self.args.scripture = '義' * 1700
        with self.assertRaisesRegex(yt.SermonError, '5000'):
            self.payload()
        self.args.scripture = '<invalid>'
        with self.assertRaises(yt.SermonError):
            self.payload()

    def test_invalid_date_and_modes(self):
        for argv in [[], ['--dry-run', '--upload'], ['--date', '20260230', '--dry-run']]:
            with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                yt.parser().parse_args(argv)
        self.args.reauthorize = True
        with self.assertRaisesRegex(yt.SermonError, '--auth-only'):
            yt.run(self.args)

    @patch.object(yt, 'build')
    @patch.object(yt, 'authenticate')
    def test_auth_only_does_not_require_config_video_or_create_service(self, authenticate, build):
        args = yt.parser().parse_args(['--auth-only', '--reauthorize'])
        with contextlib.redirect_stdout(io.StringIO()):
            yt.run(args)
        authenticate.assert_called_once_with(args)
        build.assert_not_called()

    def test_reservation_is_exclusive(self):
        path = self.root / 'receipt.json'
        record = yt.reserve_upload(path, self.args, self.payload())
        self.assertEqual(record['state'], 'pending')
        self.assertEqual(os.stat(path).st_mode & 0o777, 0o600)
        with self.assertRaisesRegex(yt.SermonError, 'already exists'):
            yt.reserve_upload(path, self.args, self.payload())

    @patch.object(yt, 'authenticate')
    def test_existing_receipt_blocks_before_authorization(self, authenticate):
        path = self.args.state_dir / '20261018.json'
        yt.reserve_upload(path, self.args, self.payload())
        with self.assertRaisesRegex(yt.SermonError, 'receipt already exists'):
            yt.run(self.args)
        authenticate.assert_not_called()

    @patch.object(yt, 'upload', return_value={'id': 'abc', 'url': 'https://www.youtube.com/watch?v=abc', 'privacy': 'private'})
    @patch.object(yt, 'build')
    @patch.object(yt, 'authenticate')
    def test_upload_saves_receipt_and_blocks_rerun(self, authenticate, build, upload):
        with contextlib.redirect_stdout(io.StringIO()) as output:
            yt.run(self.args)
        self.assertEqual(json.loads(output.getvalue())['id'], 'abc')
        receipt = json.loads((self.args.state_dir / '20261018.json').read_text())
        self.assertEqual(receipt['state'], 'completed')
        self.assertEqual(receipt['result']['id'], 'abc')
        self.assertEqual(receipt['video']['status']['privacyStatus'], 'private')
        build.return_value.close.assert_called_once()
        with self.assertRaises(yt.SermonError):
            yt.run(self.args)
        upload.assert_called_once()

    @patch.object(yt, 'upload', side_effect=TimeoutError('uncertain outcome'))
    @patch.object(yt, 'build')
    @patch.object(yt, 'authenticate')
    def test_ambiguous_failure_keeps_pending_receipt(self, authenticate, build, upload):
        with contextlib.redirect_stderr(io.StringIO()) as output, self.assertRaises(TimeoutError):
            yt.run(self.args)
        self.assertIn('Check YouTube Studio', output.getvalue())
        receipt = json.loads((self.args.state_dir / '20261018.json').read_text())
        self.assertEqual(receipt['state'], 'pending')
        build.return_value.close.assert_called_once()

    def test_upload_uses_resumable_chunks_and_no_retries(self):
        service = Mock()
        request = service.videos.return_value.insert.return_value
        progress = Mock()
        progress.progress.return_value = 0.5
        request.next_chunk.side_effect = [(progress, None), (None, {'id': 'video_123', 'status': {'privacyStatus': 'private'}})]
        with contextlib.redirect_stderr(io.StringIO()):
            result = yt.upload(service, self.args, self.payload())
        self.assertEqual(result['url'], 'https://www.youtube.com/watch?v=video_123')
        kwargs = service.videos.return_value.insert.call_args.kwargs
        self.assertFalse(kwargs['notifySubscribers'])
        self.assertTrue(kwargs['media_body'].resumable())
        self.assertTrue(kwargs['media_body'].stream().closed)
        self.assertEqual(request.next_chunk.call_count, 2)
        for call in request.next_chunk.call_args_list:
            self.assertEqual(call.kwargs, {'num_retries': 0})

    def test_missing_id_is_not_success(self):
        service = Mock()
        service.videos.return_value.insert.return_value.next_chunk.return_value = (None, {})
        with self.assertRaisesRegex(yt.SermonError, 'video ID'):
            yt.upload(service, self.args, self.payload())

    def test_atomic_secret_files_are_private(self):
        path = self.root / 'token.json'
        path.write_text('old secret')
        os.chmod(path, 0o644)
        yt.save_private_json(path, {'token': 'new secret'})
        self.assertEqual(json.loads(path.read_text()), {'token': 'new secret'})
        self.assertEqual(path.stat().st_mode & 0o777, 0o600)
        self.assertEqual(list(self.root.glob('token.json.*')), [])

    @patch.object(yt, 'InstalledAppFlow')
    def test_browser_authorization_and_no_browser_option(self, flow_class):
        self.args.client_secrets = self.root / 'client.json'
        self.args.client_secrets.write_text(json.dumps({'installed': {
            'client_id': 'test-client', 'client_secret': 'test-secret',
            'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
            'token_uri': 'https://oauth2.googleapis.com/token',
        }}))
        self.args.no_browser = True
        credentials = flow_class.from_client_config.return_value.run_local_server.return_value
        credentials.to_json.return_value = '{"refresh_token": "test-token"}'
        self.assertIs(yt.authenticate(self.args), credentials)
        flow_class.from_client_config.assert_called_once()
        self.assertEqual(flow_class.from_client_config.call_args.args[1], yt.SCOPES)
        kwargs = flow_class.from_client_config.return_value.run_local_server.call_args.kwargs
        self.assertFalse(kwargs['open_browser'])
        self.assertEqual(kwargs['port'], 0)
        self.assertEqual(kwargs['bind_addr'], '127.0.0.1')
        self.assertEqual(self.args.token.stat().st_mode & 0o777, 0o600)

    @patch.object(yt, 'InstalledAppFlow')
    def test_bad_client_files_never_launch_browser_or_expose_contents(self, flow):
        self.args.client_secrets = self.root / 'client.json'
        for text in ['secret-invalid-json', '{"web": {"client_secret": "secret-value"}}',
                     '{"installed": {"client_id": "x", "client_secret": "secret-value", "auth_uri": "https://evil.test"}}']:
            self.args.client_secrets.write_text(text)
            with self.assertRaises(yt.SermonError) as caught:
                yt.authenticate(self.args)
            self.assertNotIn('secret-value', str(caught.exception))
        flow.assert_not_called()

    @patch.object(yt, 'Credentials')
    @patch.object(yt, 'InstalledAppFlow')
    def test_saved_token_reuse_refresh_and_no_browser(self, flow, credentials_class):
        self.args.token.write_text('{"refresh_token": "test-token", "scopes": ["test"]}')
        credentials = credentials_class.from_authorized_user_info.return_value
        credentials.valid = False
        credentials.to_json.return_value = '{"refresh_token": "test-token"}'
        self.assertIs(yt.authenticate(self.args), credentials)
        credentials.refresh.assert_called_once()
        flow.assert_not_called()
        credentials.valid = True
        credentials.refresh.reset_mock()
        yt.authenticate(self.args)
        credentials.refresh.assert_not_called()

    @patch.object(yt, 'Credentials')
    def test_refresh_failure_and_missing_scope_are_actionable(self, credentials_class):
        self.args.token.write_text('{"refresh_token": "secret-token"}')
        credentials = credentials_class.from_authorized_user_info.return_value
        credentials.has_scopes.return_value = False
        with self.assertRaisesRegex(yt.SermonError, 'reauthorize'):
            yt.authenticate(self.args)
        credentials.has_scopes.return_value = True
        credentials.valid = False
        credentials.refresh.side_effect = RefreshError('secret-token')
        with self.assertRaisesRegex(yt.SermonError, 'seven days') as caught:
            yt.authenticate(self.args)
        self.assertNotIn('secret-token', str(caught.exception))
        self.assertEqual(json.loads(self.args.token.read_text())['refresh_token'], 'secret-token')

    @patch.object(yt, 'run')
    def test_http_errors_do_not_print_sensitive_response(self, run):
        run.side_effect = HttpError(Mock(status=403, reason='Forbidden'), b'{"error": "secret-token"}')
        with contextlib.redirect_stderr(io.StringIO()) as output:
            self.assertEqual(yt.main(['--auth-only']), 1)
        self.assertIn('HTTP 403', output.getvalue())
        self.assertNotIn('secret-token', output.getvalue())

    def test_default_paths_are_project_relative(self):
        self.assertEqual(self.args.config, self.config)
        args = yt.parser().parse_args(['--dry-run'])
        self.assertEqual(args.config, yt.DIRECTORY.parent / '.sermon.local.yaml')
        self.assertEqual(args.token, yt.DIRECTORY / 'token.local.json')


if __name__ == '__main__':
    unittest.main()
