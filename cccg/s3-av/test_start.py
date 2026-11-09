"""Offline integration tests for the shell entry point; no real uploads."""

import json
import os
from pathlib import Path
import runpy
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parent


class StartTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.project = self.directory / 'project'
        self.project.mkdir()
        self.media = self.directory / 'sermon files'
        self.media.mkdir()
        (self.media / 'raw.mp4').write_bytes(b'original video')
        for name in ('copy_and_start.sh', 'start.sh', 'date-dir.sh', 'video-compress.sh',
                     'audio-compress.sh', 's3-upload.sh'):
            shutil.copy2(ROOT / name, self.project / name)
        self.bin = self.directory / 'bin'
        self.bin.mkdir()
        self.log = self.directory / 'calls.jsonl'
        self.env = dict(os.environ, PATH=str(self.bin) + os.pathsep + os.environ['PATH'],
                        CALL_LOG=str(self.log))
        mock = '''import json, os, sys
from pathlib import Path
name = Path(sys.argv[0]).name
with open(os.environ['CALL_LOG'], 'a') as stream:
    stream.write(json.dumps([name] + sys.argv[1:]) + '\\n')
if name == 'youtube-upload.sh' and '--auth-only' in sys.argv:
    sys.exit(7 if os.environ.get('FAIL_AUTH') else 0)
if os.environ.get('FAIL_STAGE') == name:
    sys.exit(7)
if name == 'youtube-upload.sh':
    print(json.dumps({'url': 'https://www.youtube.com/watch?v=test_video'}))
    if os.environ.get('FAIL_RECEIPT'):
        sys.exit(7)
'''
        for name in ('python3', 'HandBrakeCLI', 'ffmpeg', 'aws'):
            self.executable(self.bin / name, mock)
        for name in ('youtube/youtube-upload.sh', 'wix/wix-post.sh'):
            self.executable(self.project / name, mock)
        self.executable(self.bin / 'uv', '''import os, sys
index = sys.argv.index('python')
os.execv(sys.executable, [sys.executable] + sys.argv[index + 1:])
''')

    def executable(self, path, content):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('#!' + sys.executable + '\n' + content)
        path.chmod(0o755)

    def run_start(self, entry_point='start.sh'):
        return subprocess.run(
            ['bash', str(self.project / entry_point), '-d', '20261018', '-f', str(self.media)],
            cwd=self.directory, env=self.env, capture_output=True, text=True,
        )

    def calls(self):
        if not self.log.exists():
            return []
        return [json.loads(line) for line in self.log.read_text().splitlines()]

    def test_pipeline_uses_raw_for_youtube_and_passes_url_to_wix(self):
        result = self.run_start()
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = self.calls()
        self.assertEqual([call[0] for call in calls],
                         ['youtube-upload.sh', 'HandBrakeCLI', 'ffmpeg', 'aws', 'aws',
                          'youtube-upload.sh', 'wix-post.sh'])
        self.assertEqual(calls[0][1:], ['--auth-only'])
        self.assertIn(str(self.media / 'raw.mp4'), calls[1])
        self.assertIn(str(self.media / '20261018.mp4'), calls[2])
        self.assertIn(str(self.media / '20261018.mp4'), calls[3])
        self.assertIn(str(self.media / '20261018.mp3'), calls[4])
        self.assertEqual(calls[5][1:], ['--date', '20261018', '--file',
                                      str(self.media / 'raw.mp4'), '--upload'])
        self.assertEqual(calls[6][1:], ['--date', '20261018', '--youtube',
                                      'https://www.youtube.com/watch?v=test_video'])

    def test_failure_stops_later_steps(self):
        stages = ['HandBrakeCLI', 'ffmpeg', 'aws', 'youtube-upload.sh', 'wix-post.sh']
        for stage in stages:
            with self.subTest(stage=stage):
                self.log.unlink(missing_ok=True)
                self.env['FAIL_STAGE'] = stage
                result = self.run_start()
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.calls()[-1][0], stage)

    def test_copy_entry_point_delegates_to_full_pipeline(self):
        result = self.run_start('copy_and_start.sh')
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = self.calls()
        self.assertEqual(calls[0], ['python3', str(self.project / 'copy_new_video.py'),
                                    '--target-dir', str(self.media)])
        self.assertEqual(calls[1], ['youtube-upload.sh', '--auth-only'])
        self.assertEqual(calls[-1], ['wix-post.sh', '--date', '20261018', '--youtube',
                                     'https://www.youtube.com/watch?v=test_video'])
        self.assertIn(str(self.media / 'raw.mp4'), calls[-2])

    def test_copy_script_uses_selected_destination_and_newest_video(self):
        older = self.directory / 'older.mp4'
        newer = self.directory / 'newer.MP4'
        older.write_bytes(b'old sermon')
        newer.write_bytes(b'new sermon')
        with patch.object(sys, 'argv', ['copy_new_video.py', '--target-dir', str(self.media)]), \
                patch('glob.glob', side_effect=[[str(older)], [str(newer)]]), \
                patch('os.path.getctime', side_effect=lambda path: 2 if path == str(newer) else 1):
            runpy.run_path(str(ROOT / 'copy_new_video.py'))
        self.assertEqual((self.media / 'raw.mp4').read_bytes(), b'new sermon')

    def test_copy_failure_stops_before_processing_or_uploading(self):
        self.env['FAIL_STAGE'] = 'python3'
        result = self.run_start('copy_and_start.sh')
        self.assertEqual(result.returncode, 7)
        self.assertEqual(len(self.calls()), 1)

    def test_auth_failure_stops_before_processing(self):
        self.env['FAIL_AUTH'] = '1'
        result = self.run_start()
        self.assertEqual(result.returncode, 7)
        self.assertEqual(self.calls(), [['youtube-upload.sh', '--auth-only']])

    def test_receipt_failure_prints_recovery_url_and_skips_wix(self):
        self.env['FAIL_RECEIPT'] = '1'
        result = self.run_start()
        self.assertEqual(result.returncode, 7)
        self.assertIn('https://www.youtube.com/watch?v=test_video', result.stdout)
        self.assertNotIn('wix-post.sh', [call[0] for call in self.calls()])

    def test_missing_raw_stops_before_processing(self):
        (self.media / 'raw.mp4').unlink()
        result = self.run_start()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('raw.mp4', result.stderr)
        self.assertEqual(self.calls(), [])


if __name__ == '__main__':
    unittest.main()
