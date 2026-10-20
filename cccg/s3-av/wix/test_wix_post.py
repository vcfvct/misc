"""Offline tests: uv run --locked python -m unittest -v test_wix_post.py."""

import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.error

import wix_post as wix


AUTHOR_ID = '11111111-1111-4111-8111-111111111111'
CATEGORY_ID = '22222222-2222-4222-8222-222222222222'
DRAFT_ID = '33333333-3333-4333-8333-333333333333'
ARGS = [
    '--date', '20261011', '--title', '十字架，慈爱与公义的彰显',
    '--speaker', '許健文長老', '--scripture', '羅馬書 3:21–26',
    '--youtube', 'https://www.youtube.com/watch?v=Z-fl0bIrXCs&t=201s',
]


class WixPostTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.config_path = Path(self.temp.name) / 'missing.yaml'
        self.args = wix.parser().parse_args(['--config', str(self.config_path)] + ARGS)
        self.env = patch.dict('os.environ', {}, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)

    def test_payload_contains_chinese_and_correct_media_paths(self):
        passage = Path(self.temp.name) / 'passage.txt'
        passage.write_text('\ufeff21 但如今，神的義\n\n22 就是神的義\n', encoding='utf-8')
        self.args.passage_file = passage
        post = wix.build_post(self.args, AUTHOR_ID, CATEGORY_ID)
        self.assertEqual(post['title'], '十字架，慈爱与公义的彰显--20261011')
        self.assertEqual(post['seoSlug'], 'sermon-20261011')
        self.assertEqual(post['memberId'], AUTHOR_ID)
        self.assertEqual(post['categoryIds'], [CATEGORY_ID])
        self.assertNotIn('firstPublishedDate', post)
        nodes = post['richContent']['nodes']
        self.assertEqual([node['type'] for node in nodes[:8]], [
            'HEADING', 'VIDEO', 'PARAGRAPH', 'BUTTON', 'BUTTON',
            'PARAGRAPH', 'PARAGRAPH', 'HEADING',
        ])
        self.assertEqual(nodes[1]['videoData'], {
            'containerData': {
                'width': {'size': 'CONTENT'}, 'alignment': 'CENTER', 'textWrap': True,
            },
            'video': {'src': {'url': self.args.youtube}},
        })
        buttons = [node['buttonData'] for node in nodes if node['type'] == 'BUTTON']
        self.assertEqual([button['link']['url'] for button in buttons], [
            'https://cccg-media.s3.amazonaws.com/videos/sermon/2026/20261011.mp4',
            'https://cccg-media.s3.amazonaws.com/audio/sermon/2026/20261011.mp3',
        ])
        self.assertEqual([button['text'] for button in buttons], ['下载视频', '下载音频'])
        for button, alignment in zip(buttons, ['LEFT', 'RIGHT']):
            self.assertEqual(button['type'], 'LINK')
            self.assertEqual(button['containerData'], {
                'width': {'size': 'ORIGINAL'}, 'alignment': alignment, 'textWrap': True,
            })
        self.assertEqual(buttons[0]['styles'], {'borderWidth': 0, 'borderRadius': 0})
        self.assertEqual(buttons[1]['styles'], {'borderRadius': 2})
        self.assertEqual([button['link']['target'] for button in buttons], ['BLANK', 'TOP'])
        self.assertTrue(all(not child['textData']['decorations']
                            for node in nodes for child in node['nodes']))
        self.assertEqual(nodes[-2]['nodes'][0]['textData']['text'], '21 但如今，神的義')
        self.assertEqual(len(nodes), len({node['id'] for node in nodes}))

    def test_youtube_embed_preserves_url_and_timestamp(self):
        for url in [
            'https://www.youtube.com/watch?v=Z-fl0bIrXCs&t=201s',
            'https://youtu.be/Z-fl0bIrXCs?t=201',
            'https://www.youtube.com/embed/Z-fl0bIrXCs?start=201',
        ]:
            with self.subTest(url=url):
                self.args.youtube = url
                nodes = wix.build_post(self.args)['richContent']['nodes']
                videos = [node for node in nodes if node['type'] == 'VIDEO']
                self.assertEqual(len(videos), 1)
                self.assertEqual(videos[0]['videoData']['video']['src']['url'], url)
                self.assertEqual(videos[0]['nodes'], [])

    def test_cover_image_url_sets_custom_cover_not_body_image(self):
        image_id = '9f045a_307a9c989ef54347be844c76c0c6c2ab~mv2.png'
        self.args.cover_image_url = 'https://static.wixstatic.com/media/' + image_id
        self.args.cover_image_alt = '十字架：慈爱与公义的彰显'
        post = wix.build_post(self.args)
        self.assertEqual(post['media'], {
            'wixMedia': {'image': {'id': image_id}},
            'custom': True, 'displayed': True, 'altText': self.args.cover_image_alt,
        })
        self.assertNotIn('IMAGE', [node['type'] for node in post['richContent']['nodes']])

    def test_cover_image_url_and_id_produce_same_media(self):
        image_id = '9f045a_307a9c989ef54347be844c76c0c6c2ab~mv2.png'
        self.args.cover_image_id = image_id
        expected = wix.build_post(self.args)['media']
        self.args.cover_image_id = None
        for suffix in ['', '?download=true#image', '/v1/fill/w_800,h_600/cover.png']:
            with self.subTest(suffix=suffix):
                self.args.cover_image_url = 'https://static.wixstatic.com/media/' + image_id + suffix
                self.assertEqual(wix.build_post(self.args)['media'], expected)

    def test_cover_image_id_and_default_alt(self):
        self.args.cover_image_id = '9f045a_example~mv2.png'
        media = wix.build_post(self.args)['media']
        self.assertEqual(media['wixMedia']['image'], {'id': self.args.cover_image_id})
        self.assertEqual(media['altText'], self.args.title)

    def test_no_cover_leaves_payload_unchanged(self):
        self.assertNotIn('media', wix.build_post(self.args))

    def test_cover_image_rejects_invalid_urls(self):
        for url in ['wix:image://v1/example/image.png', 'https://www.cccgermantown.org/post/example',
                    'https://example.org/cover.png', 'http://static.wixstatic.com/media/a.png',
                    'https://static.wixstatic.com/media/',
                    'https://static.wixstatic.com/media/../cover.png',
                    'https://static.wixstatic.com/media//cover.png',
                    'https://static.wixstatic.com.evil.test/media/a.png',
                    'https://user:password@static.wixstatic.com/media/a.png', '']:
            with self.subTest(url=url):
                self.args.cover_image_url = url
                with self.assertRaises(wix.PostError):
                    wix.build_post(self.args)

    def test_cover_image_validates_id_and_alt(self):
        for image_id in ['', '   ', '../cover.png', 'wix:image://v1/example/image.png',
                         'https://static.wixstatic.com/media/a.png']:
            with self.subTest(image_id=image_id):
                self.args.cover_image_id = image_id
                with self.assertRaises(wix.PostError):
                    wix.build_post(self.args)
        self.args.cover_image_id = '9f045a_example~mv2.png'
        for alt in ['', '   ', 'a' * 1001]:
            self.args.cover_image_alt = alt
            with self.assertRaises(wix.PostError):
                wix.build_post(self.args)
        self.args.cover_image_id = None
        self.args.cover_image_alt = 'Image description'
        with self.assertRaisesRegex(wix.PostError, 'requires'):
            wix.build_post(self.args)

    def test_cover_flags_are_mutually_exclusive(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            wix.parser().parse_args(ARGS + [
                '--cover-image-url', 'https://static.wixstatic.com/media/example.png',
                '--cover-image-id', 'example.png',
            ])

    def test_overrides_and_year(self):
        self.args.date = wix.sermon_date('20270103')
        self.args.audio_url = 'https://example.org/custom.mp3'
        self.args.media_base_url = 'https://media.example.org/'
        payload = json.dumps(wix.build_post(self.args))
        self.assertIn('https://media.example.org/videos/sermon/2027/20270103.mp4', payload)
        self.assertIn('https://example.org/custom.mp3', payload)

    def test_invalid_inputs(self):
        for url in ['javascript:alert(1)', 'https://youtube.com.evil.test/watch?v=x',
                    'https://user:password@youtube.com/watch?v=x', 'https://youtube.com/a b']:
            self.args.youtube = url
            with self.subTest(url=url), self.assertRaises(wix.PostError):
                wix.build_post(self.args)
        for date in ['20260230', '2026-10-11', '2026111']:
            with self.subTest(date=date), self.assertRaises(wix.argparse.ArgumentTypeError):
                wix.sermon_date(date)
        self.args.youtube = 'https://youtu.be/abc'
        self.args.title = 'x' * 200
        with self.assertRaises(wix.PostError):
            wix.build_post(self.args)

    def test_oversized_passage(self):
        passage = Path(self.temp.name) / 'large.txt'
        passage.write_text('義' * 140000, encoding='utf-8')
        self.args.passage_file = passage
        with self.assertRaises(wix.PostError):
            wix.build_post(self.args)

    @patch.object(wix, 'WixClient')
    def test_dry_run_is_offline_without_credentials(self, client):
        self.args.dry_run = True
        with contextlib.redirect_stdout(io.StringIO()) as out, contextlib.redirect_stderr(io.StringIO()):
            wix.run(self.args)
        client.assert_not_called()
        payload = json.loads(out.getvalue())
        self.assertNotIn('memberId', payload['draftPost'])
        self.assertNotIn('Authorization', out.getvalue())

    @patch.object(wix, 'WixClient')
    def test_default_creates_only_draft(self, client_class):
        self.args.author_id = AUTHOR_ID
        self.args.cover_image_url = 'https://static.wixstatic.com/media/9f045a_example~mv2.png'
        client = client_class.return_value
        client.categories.return_value = [{'id': CATEGORY_ID, 'label': '主日信息'}]
        client.request.return_value = {'draftPost': {'id': DRAFT_ID}}
        with contextlib.redirect_stdout(io.StringIO()) as out:
            wix.run(self.args)
        self.assertIn(str(Path(wix.__file__).resolve().with_name('wix-post.sh')), out.getvalue())
        self.assertIn('--publish --publish-draft ' + DRAFT_ID, out.getvalue())
        client.check_duplicates.assert_called_once()
        method, path, payload = client.request.call_args.args
        self.assertEqual((method, path), ('POST', '/blog/v3/draft-posts'))
        self.assertEqual(payload['draftPost']['categoryIds'], [CATEGORY_ID])
        self.assertEqual(payload['draftPost']['media']['wixMedia']['image'],
                         {'id': '9f045a_example~mv2.png'})
        client.publish.assert_not_called()

    @patch.object(wix, 'WixClient')
    def test_explicit_publish(self, client_class):
        self.args.author_id = AUTHOR_ID
        self.args.publish = True
        client = client_class.return_value
        client.categories.return_value = [{'id': CATEGORY_ID, 'label': '主日信息'}]
        client.request.return_value = {'draftPost': {'id': DRAFT_ID}}
        client.publish.return_value = {'postId': DRAFT_ID}
        with contextlib.redirect_stdout(io.StringIO()):
            wix.run(self.args)
        client.publish.assert_called_once_with(DRAFT_ID)

    @patch.object(wix, 'WixClient')
    def test_duplicate_aborts_creation(self, client_class):
        self.args.author_id = AUTHOR_ID
        client = client_class.return_value
        client.categories.return_value = [{'id': CATEGORY_ID, 'label': '主日信息'}]
        client.check_duplicates.side_effect = wix.PostError('Duplicate')
        with self.assertRaises(wix.PostError):
            wix.run(self.args)
        client.request.assert_not_called()
        client.publish.assert_not_called()

    @patch.object(wix, 'WixClient')
    def test_nonexistent_or_ambiguous_category_aborts(self, client_class):
        self.args.author_id = AUTHOR_ID
        client = client_class.return_value
        for categories in [[], [{'id': CATEGORY_ID, 'label': '主日信息'}] * 2]:
            client.categories.return_value = categories
            with self.assertRaises(wix.PostError):
                wix.run(self.args)
        self.args.category_id = CATEGORY_ID
        client.categories.return_value = []
        with self.assertRaises(wix.PostError):
            wix.run(self.args)
        client.request.assert_not_called()

    def test_resume_publish_requires_confirmation(self):
        self.args.publish_draft = DRAFT_ID
        with self.assertRaisesRegex(wix.PostError, 'requires --publish'):
            wix.run(self.args)
        self.args.publish = True
        with patch.object(wix, 'WixClient') as client_class, contextlib.redirect_stdout(io.StringIO()):
            client_class.return_value.publish.return_value = {'postId': DRAFT_ID}
            wix.run(self.args)
            client_class.return_value.publish.assert_called_once_with(DRAFT_ID)
            client_class.return_value.request.assert_not_called()

    def test_incompatible_modes(self):
        self.args.dry_run = True
        self.args.publish = True
        with self.assertRaises(wix.PostError):
            wix.run(self.args)
        self.args.publish = False
        self.args.list_categories = True
        with self.assertRaises(wix.PostError):
            wix.run(self.args)

    @patch.object(wix, 'WixClient')
    def test_missing_author_and_required_args(self, client_class):
        client_class.return_value.members.return_value = []
        with self.assertRaisesRegex(wix.PostError, 'author-id'):
            wix.run(self.args)
        client_class.return_value.request.assert_not_called()
        self.args.youtube = None
        with self.assertRaisesRegex(wix.PostError, '--youtube'):
            wix.run(self.args)

    def test_config_and_env_precedence(self):
        self.config_path.write_text(
            'wixApiKey: config-key\nauthorId: ' + AUTHOR_ID + '\nsiteId: ' + wix.SITE_ID + '\n',
            encoding='utf-8',
        )
        self.args.dry_run = True
        with patch.dict('os.environ', {'WIX_AUTHOR_ID': CATEGORY_ID}), contextlib.redirect_stdout(io.StringIO()) as out:
            wix.run(self.args)
        self.assertEqual(json.loads(out.getvalue())['draftPost']['memberId'], CATEGORY_ID)
        config = wix.load_config(self.config_path)
        self.assertEqual(config['wixApiKey'], 'config-key')
        self.config_path.write_text('unknown: field\n', encoding='utf-8')
        with self.assertRaises(wix.PostError):
            wix.load_config(self.config_path)

    def test_yaml_config_with_comments_and_blank_values(self):
        path = Path(self.temp.name) / 'config.yaml'
        path.write_text(
            '# Local settings\nsiteId: ' + wix.SITE_ID + '\n'
            'authorId: "' + AUTHOR_ID + '"\ncategoryId:\nwixApiKey: "secret: key # text"\n',
            encoding='utf-8',
        )
        self.assertEqual(wix.load_config(path), {
            'siteId': wix.SITE_ID, 'authorId': AUTHOR_ID,
            'categoryId': '', 'wixApiKey': 'secret: key # text',
        })
        self.args.config = path
        self.args.dry_run = True
        with contextlib.redirect_stdout(io.StringIO()) as out, contextlib.redirect_stderr(io.StringIO()):
            wix.run(self.args)
        self.assertEqual(json.loads(out.getvalue())['draftPost']['memberId'], AUTHOR_ID)
        self.assertNotIn('secret: key', out.getvalue())

    def test_yml_extension_and_empty_yaml(self):
        path = Path(self.temp.name) / 'config.yml'
        path.write_text('# Empty config is fine\n', encoding='utf-8')
        self.assertEqual(wix.load_config(path), {})
        path.write_text('authorId: "' + AUTHOR_ID + '"\n', encoding='utf-8')
        self.assertEqual(wix.load_config(path), {'authorId': AUTHOR_ID})

    def test_invalid_yaml_and_unsafe_tags_do_not_expose_secrets(self):
        path = Path(self.temp.name) / 'config.yaml'
        for text in ['wixApiKey: [secret-value\n', '!!python/object/apply:os.system [secret-value]']:
            path.write_text(text, encoding='utf-8')
            with self.assertRaisesRegex(wix.PostError, 'Invalid YAML') as caught:
                wix.load_config(path)
            self.assertNotIn('secret-value', str(caught.exception))

    def test_yaml_validates_mapping_types_and_unknown_keys(self):
        path = Path(self.temp.name) / 'config.yaml'
        for text in ['- authorId\n', '42: value\n', 'authorId: 123\n',
                     'wixApiKey: true\n', 'authorId: {}\n', 'title: 123\n', 'unknown: value\n']:
            with self.subTest(text=text):
                path.write_text(text, encoding='utf-8')
                with self.assertRaises(wix.PostError):
                    wix.load_config(path)

    def test_yaml_missing_dependency_is_actionable(self):
        path = Path(self.temp.name) / 'config.yaml'
        path.write_text('authorId: ""\n', encoding='utf-8')
        with patch.dict('sys.modules', {'yaml': None}):
            with self.assertRaisesRegex(wix.PostError, 'uv sync --locked'):
                wix.load_config(path)

    def test_default_config_is_in_shared_project_root(self):
        self.assertEqual(wix.CONFIG_PATH,
                         Path(wix.__file__).resolve().parent.parent / '.sermon.local.yaml')

    def test_default_config_is_yaml(self):
        yaml_path = Path(self.temp.name) / '.sermon.local.yaml'
        with patch.object(wix, 'CONFIG_PATH', yaml_path):
            args = wix.parser().parse_args(ARGS + ['--dry-run'])
            self.assertEqual(args.config, yaml_path)
            yaml_path.write_text('authorId: ' + CATEGORY_ID + '\n', encoding='utf-8')
            with contextlib.redirect_stdout(io.StringIO()) as out, contextlib.redirect_stderr(io.StringIO()):
                wix.run(args)
            self.assertEqual(json.loads(out.getvalue())['draftPost']['memberId'], CATEGORY_ID)

    def test_unsupported_config_extension(self):
        for suffix in ('.txt', '.json'):
            with self.subTest(suffix=suffix):
                path = Path(self.temp.name) / ('config' + suffix)
                with self.assertRaisesRegex(wix.PostError, 'extension'):
                    wix.load_config(path)
                path.write_text('{}', encoding='utf-8')
                with self.assertRaisesRegex(wix.PostError, 'extension'):
                    wix.load_config(path)

    def test_duplicate_check_uses_published_endpoint(self):
        client = wix.WixClient(wix.SITE_ID, 'secret')
        with patch.object(client, 'request', return_value={'posts': [{'id': DRAFT_ID}]}) as request:
            with self.assertRaisesRegex(wix.PostError, 'published post'):
                client.check_duplicates(wix.build_post(self.args))
            self.assertEqual(request.call_args.args[1], '/v3/posts/query')
            self.assertEqual(request.call_args.args[2]['query']['filter']['$or'][0],
                             {'slug': 'sermon-20261011'})

    def test_duplicate_draft_on_second_page_with_changed_title(self):
        client = wix.WixClient(wix.SITE_ID, 'secret')
        responses = [
            {'posts': []},
            {'draftPosts': [{'id': AUTHOR_ID, 'title': 'other'}],
             'pagingMetadata': {'cursors': {'next': 'page-2'}}},
            {'draftPosts': [{'id': DRAFT_ID, 'title': 'changed', 'seoSlug': 'sermon-20261011'}]},
        ]
        with patch.object(client, 'request', side_effect=responses) as request:
            with self.assertRaisesRegex(wix.PostError, 'matching draft'):
                client.check_duplicates(wix.build_post(self.args))
            self.assertEqual(request.call_args.args[2]['query']['cursorPaging']['cursor'], 'page-2')

    def test_duplicate_check_finishes_and_repeated_cursor_fails(self):
        client = wix.WixClient(wix.SITE_ID, 'secret')
        with patch.object(client, 'request', side_effect=[{'posts': []}, {'draftPosts': []}]):
            client.check_duplicates(wix.build_post(self.args))
        page = {'draftPosts': [], 'pagingMetadata': {'cursors': {'next': 'same'}}}
        with patch.object(client, 'request', side_effect=[{'posts': []}, page, page]):
            with self.assertRaisesRegex(wix.PostError, 'repeated'):
                client.check_duplicates(wix.build_post(self.args))

    def test_inspect_post_encodes_slug(self):
        client = wix.WixClient(wix.SITE_ID, 'secret')
        with patch.object(client, 'request', return_value={'post': {'memberId': AUTHOR_ID}}) as request:
            post = client.inspect_post('https://example.org/post/copy-of-%E6%B8%85?x=1')
            self.assertEqual(post['memberId'], AUTHOR_ID)
            self.assertEqual(request.call_args.args[1], '/v3/posts/slugs/copy-of-%E6%B8%85')

    def test_members_pagination_uses_public_fields(self):
        client = wix.WixClient(wix.SITE_ID, 'secret')
        with patch.object(client, 'request', side_effect=[
            {'members': [{'id': AUTHOR_ID}] * 100}, {'members': [{'id': CATEGORY_ID}]},
        ]) as request:
            self.assertEqual(len(list(client.members())), 101)
            self.assertEqual(request.call_args.args[1], '/members/v1/members/query')
            self.assertEqual(request.call_args.args[2], {
                'query': {'paging': {'limit': 100, 'offset': 100}}, 'fieldsets': ['PUBLIC'],
            })

    def test_resolve_author_exact_then_normalized_match(self):
        client = unittest.mock.Mock()
        client.members.return_value = [
            {'id': AUTHOR_ID, 'profile': {'nickname': '許健文長老'}},
            {'id': CATEGORY_ID, 'profile': {'nickname': '許健文 長老'}},
        ]
        with contextlib.redirect_stderr(io.StringIO()) as out:
            self.assertEqual(wix.resolve_author(client, '許健文長老', DRAFT_ID), AUTHOR_ID)
        self.assertIn('matched speaker', out.getvalue())
        self.assertNotIn('fallback', out.getvalue())
        client.members.return_value = client.members.return_value[:1]
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(wix.resolve_author(client, '許健文\u3000長老'), AUTHOR_ID)
        client.members.return_value = [{'id': AUTHOR_ID, 'profile': {'nickname': 'Ｐａｕｌ'}}]
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(wix.resolve_author(client, 'paul'), AUTHOR_ID)

    def test_resolve_author_no_match_uses_default_and_reports(self):
        client = unittest.mock.Mock()
        client.members.return_value = [{'id': CATEGORY_ID, 'profile': {'nickname': '許健文長老'}}]
        for speaker in ['另一位講員', '许健文长老', '許健文']:
            with self.subTest(speaker=speaker), contextlib.redirect_stderr(io.StringIO()) as out:
                self.assertEqual(wix.resolve_author(client, speaker, AUTHOR_ID), AUTHOR_ID)
            self.assertIn('fallback', out.getvalue())
            self.assertIn(speaker, out.getvalue())
            self.assertIn(AUTHOR_ID, out.getvalue())
        with self.assertRaisesRegex(wix.PostError, 'no default'):
            wix.resolve_author(client, '另一位講員')

    def test_resolve_author_ambiguity_stops_even_with_default(self):
        client = unittest.mock.Mock()
        for names, speaker in [(['許健文長老', '許健文長老'], '許健文長老'),
                               (['許健文 長老', '許健文\u3000長老'], '許健文長老')]:
            client.members.return_value = [
                {'id': member_id, 'profile': {'nickname': name}}
                for member_id, name in zip([AUTHOR_ID, CATEGORY_ID], names)
            ]
            with self.assertRaisesRegex(wix.PostError, 'Multiple Wix members'):
                wix.resolve_author(client, speaker, DRAFT_ID)

    @patch.object(wix, 'WixClient')
    def test_lookup_failure_never_falls_back_or_creates(self, client_class):
        self.config_path.write_text('authorId: ' + AUTHOR_ID + '\n', encoding='utf-8')
        client = client_class.return_value
        client.members.side_effect = wix.PostError('Read Members permission denied')
        with self.assertRaisesRegex(wix.PostError, 'Read Members'):
            wix.run(self.args)
        client.request.assert_not_called()
        client.publish.assert_not_called()

    @patch.object(wix, 'WixClient')
    def test_config_speaker_lookup_overrides_default_author(self, client_class):
        self.config_path.write_text('speaker: 許健文長老\nauthorId: ' + AUTHOR_ID + '\n', encoding='utf-8')
        self.args.speaker = None
        client = client_class.return_value
        client.members.return_value = [{'id': CATEGORY_ID, 'profile': {'nickname': '許健文長老'}}]
        client.categories.return_value = [{'id': CATEGORY_ID, 'label': '主日信息'}]
        client.request.return_value = {'draftPost': {'id': DRAFT_ID}}
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()) as err:
            wix.run(self.args)
        self.assertEqual(client.request.call_args.args[2]['draftPost']['memberId'], CATEGORY_ID)
        self.assertEqual(self.args.speaker, '許健文長老')
        self.assertIn(CATEGORY_ID, err.getvalue())

    @patch.object(wix, 'WixClient')
    def test_config_default_author_fallback_is_in_creation_payload(self, client_class):
        self.config_path.write_text('authorId: ' + AUTHOR_ID + '\n', encoding='utf-8')
        client = client_class.return_value
        client.members.return_value = []
        client.categories.return_value = [{'id': CATEGORY_ID, 'label': '主日信息'}]
        client.request.return_value = {'draftPost': {'id': DRAFT_ID}}
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()) as err:
            wix.run(self.args)
        self.assertEqual(client.request.call_args.args[2]['draftPost']['memberId'], AUTHOR_ID)
        self.assertIn('fallback', err.getvalue())
        client.publish.assert_not_called()

    @patch.object(wix, 'WixClient')
    def test_explicit_author_skips_lookup(self, client_class):
        self.args.author_id = AUTHOR_ID
        client = client_class.return_value
        client.categories.return_value = [{'id': CATEGORY_ID, 'label': '主日信息'}]
        client.request.return_value = {'draftPost': {'id': DRAFT_ID}}
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()) as err:
            wix.run(self.args)
        client.members.assert_not_called()
        self.assertIn('lookup skipped', err.getvalue())

    @patch.object(wix, 'WixClient')
    def test_yaml_speaker_offline_and_cli_override(self, client_class):
        self.config_path.write_text('speaker: 許健文長老\nauthorId: ' + AUTHOR_ID + '\n', encoding='utf-8')
        self.args.dry_run = True
        for cli_speaker, expected in [(None, '許健文長老'), ('另一位講員', '另一位講員')]:
            self.args.speaker = cli_speaker
            with contextlib.redirect_stdout(io.StringIO()) as out, contextlib.redirect_stderr(io.StringIO()) as err:
                wix.run(self.args)
            payload = json.loads(out.getvalue())
            heading = payload['draftPost']['richContent']['nodes'][0]
            self.assertIn(expected, heading['nodes'][0]['textData']['text'])
            self.assertIn('provisional', err.getvalue())
        client_class.assert_not_called()

    @patch.object(wix, 'WixClient')
    def test_yaml_title_offline_and_cli_override(self, client_class):
        self.config_path.write_text("title: '因信称义，从定罪到与神和好'\n", encoding='utf-8')
        self.args.dry_run = True
        self.args.cover_image_id = 'example.png'
        for cli_title, expected in [(None, '因信称义，从定罪到与神和好'), ('另一篇证道', '另一篇证道')]:
            with self.subTest(cli_title=cli_title):
                self.args.title = cli_title
                with contextlib.redirect_stdout(io.StringIO()) as out, contextlib.redirect_stderr(io.StringIO()):
                    wix.run(self.args)
                post = json.loads(out.getvalue())['draftPost']
                self.assertEqual(post['title'], expected + '--20261011')
                self.assertEqual(post['seoSlug'], 'sermon-20261011')
                self.assertIn(expected, post['richContent']['nodes'][0]['nodes'][0]['textData']['text'])
                self.assertEqual(post['media']['altText'], expected)
        client_class.assert_not_called()

    @patch.object(wix, 'WixClient')
    def test_missing_and_blank_titles_are_rejected_offline(self, client_class):
        self.args.dry_run = True
        for config in ['', 'title:\n', "title: ''\n", "title: '   '\n"]:
            with self.subTest(config=config):
                self.args.title = None
                self.config_path.write_text(config, encoding='utf-8')
                with self.assertRaises(wix.PostError):
                    wix.run(self.args)
        self.config_path.write_text('title: 配置标题\n', encoding='utf-8')
        for title in ['', '   ']:
            self.args.title = title
            with self.subTest(title=title), self.assertRaises(wix.PostError):
                wix.run(self.args)
        client_class.assert_not_called()

    def test_categories_pagination(self):
        client = wix.WixClient(wix.SITE_ID, 'secret')
        with patch.object(client, 'request', side_effect=[
            {'categories': [{'id': CATEGORY_ID}] * 100}, {'categories': [{'id': AUTHOR_ID}]},
        ]) as request:
            self.assertEqual(len(list(client.categories())), 101)
            self.assertIn('paging.offset=100', request.call_args.args[1])

    def test_http_headers_and_utf8_body(self):
        client = wix.WixClient(wix.SITE_ID, 'secret')
        response = io.BytesIO(b'{"postId": "ok"}')
        with patch.object(client.opener, 'open', return_value=response) as open_request:
            self.assertEqual(client.request('POST', '/test', {'title': '義'}), {'postId': 'ok'})
        request = open_request.call_args.args[0]
        self.assertEqual(request.get_header('Authorization'), 'secret')
        self.assertEqual(request.get_header('Wix-site-id'), wix.SITE_ID)
        self.assertIn('義'.encode('utf-8'), request.data)
        self.assertEqual(open_request.call_args.kwargs['timeout'], 30)

    def test_http_errors_redact_key_and_do_not_retry(self):
        client = wix.WixClient(wix.SITE_ID, 'secret')
        error = urllib.error.HTTPError(wix.API_BASE, 403, 'Forbidden', {}, io.BytesIO(b'secret denied'))
        with patch.object(client.opener, 'open', side_effect=error) as open_request:
            with self.assertRaises(wix.PostError) as caught:
                client.request('POST', '/test', {})
            self.assertNotIn('secret', str(caught.exception))
            self.assertIn('permissions', str(caught.exception))
            open_request.assert_called_once()

    def test_network_failure_does_not_retry(self):
        client = wix.WixClient(wix.SITE_ID, 'secret')
        with patch.object(client.opener, 'open', side_effect=TimeoutError('timed out')) as open_request:
            with self.assertRaisesRegex(wix.PostError, 'check the Wix dashboard'):
                client.request('POST', '/blog/v3/draft-posts', {})
            open_request.assert_called_once()

    def test_redirects_are_refused(self):
        self.assertIsNone(wix.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://evil.test'))


if __name__ == '__main__':
    unittest.main()
