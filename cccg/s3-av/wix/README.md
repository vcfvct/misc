# Wix Sunday sermon posts

The commands in this guide run from `wix/`. From the parent directory, first run:

```sh
cd wix
```

Alternatively, invoke `./wix/wix-post.sh` from the parent directory. The wrapper
finds the shared parent Python project and root-level config regardless of your
working directory. Relative `--passage-file` and `--config` paths remain relative to your
working directory.

Shared files live in the parent directory: `pyproject.toml`, `uv.lock`, `.venv/`,
`sermon.config.example.yaml`, and `.sermon.local.yaml`. The shared config keeps
Wix credentials under the service-specific `wixApiKey` key; the
[YouTube uploader](../youtube/README.md) reads the same `title` and `speaker`
fields and uses the same Python environment.

`./wix-post.sh` creates a **Wix Blog draft** independently of the compression/upload
scripts. It requires Bash and [uv](https://docs.astral.sh/uv/getting-started/installation/).
Python 3.8+ and PyYAML are managed by uv. `start.sh` is unchanged. Run the posting
script after uploading the media and obtaining the YouTube URL.

Install shared dependencies from this directory (uv discovers the parent project;
the same command also works from the project root, in fish or Bash):

```sh
uv sync --locked
```

The root `pyproject.toml` declares dependencies and `uv.lock` pins the resolved
versions. `wix-post.sh` uses `uv run --locked` to create/update the root `.venv`
automatically; you do not need to activate it or run pip manually. The wrapper
also locates the project when called from another working directory, without
changing how relative passage/config paths are resolved. Dependency installation
may need network access on first use.

To change dependencies, use `uv add PACKAGE` or `uv remove PACKAGE`. To update
PyYAML within the declared range, use `uv lock --upgrade-package PyYAML`, then
`uv sync --locked` and rerun the tests. Commit both `pyproject.toml` and `uv.lock`.

The generated post contains a Chinese title with the sermon date, speaker name,
an embedded YouTube player, video/audio download buttons, and optional Scripture
reference and passage text. The player and buttons use native Wix rich-content
blocks, matching the [reference sermon post](https://www.cccgermantown.org/post/因信称义，从定罪到与神和好-20261018):
video download on the left and audio download on the right, with text wrapping
and spacing before Scripture. The site's Wix theme controls their final appearance
and responsive layout. It does not copy an existing post's image; you can select
an existing Wix image as the cover using the options below.
Comments are disabled by default; adjust the draft in Wix if desired.

### 1. Preview offline first

No Wix credentials or Wix API requests are needed. After `uv sync --locked`,
the preview itself runs offline:

```bash
./wix-post.sh \
    --date 20261018 \
    --title '本周证道标题' \
    --speaker '講員姓名' \
    --scripture '羅馬書 3:21–26' \
    --youtube 'https://www.youtube.com/watch?v=YOUR_VIDEO_ID' \
    --dry-run
```

The JSON output is the proposed API payload. Author/category IDs are omitted if
not yet configured. Dates must be real calendar dates in `YYYYMMDD` format;
non-Sunday dates are allowed for special services. Always quote YouTube URLs,
especially if they contain `&t=...` timestamps. The original YouTube URL,
including any timestamp, is passed to Wix's video block unchanged; check playback
and the starting position in the draft preview.

Download URLs follow the existing `s3-upload.sh` paths, for example:

- `https://cccg-media.s3.amazonaws.com/videos/sermon/2026/20261018.mp4`
- `https://cccg-media.s3.amazonaws.com/audio/sermon/2026/20261018.mp3`

Use `--video-url` / `--audio-url` for individual overrides, or `--media-base-url`
to change the origin. The script does **not** upload media or verify that these
URLs are available; confirm the uploads and YouTube video before publishing.

### 2. Configure Wix access locally

An owner/co-owner of the Wix account that owns the site must generate an API key.
See [Wix: Generate an API Key](https://dev.wix.com/docs/api-reference/articles/authentication/api-keys/generate-an-api-key).
Restrict its site access to `d3e23eb0-5924-40a9-b990-daa4f82cd0ee` and grant the
Blog permissions required by these endpoints:

- **Read Blog**: inspect published posts and list categories.
- **Read Draft Blog Posts**: check existing drafts to avoid duplicates.
- **Manage Blog**: create and publish drafts.
- **Read Members**: look up the speaker's member ID by display name (not needed
  when `--author-id` or `WIX_AUTHOR_ID` explicitly selects the author).

The dashboard may group permissions differently; use the narrowest available
Blog and Members permissions that cover those operations. Speaker lookup requests
only public member fields, not email addresses or private contact details.

Load the key into your shell without putting it into command history:

```fish
read --silent --prompt-str 'Wix API key: ' WIX_API_KEY
set -gx WIX_API_KEY "$WIX_API_KEY"
# First-time setup only; do not overwrite an existing local config.
cp ../sermon.config.example.yaml ../.sermon.local.yaml
chmod 600 ../.sermon.local.yaml
```

For Bash, use `read -r -s -p 'Wix API key: ' WIX_API_KEY; echo` followed by
`export WIX_API_KEY` instead of the first two lines.

The default config location is the project root (one directory above the script),
even if invoked from another working directory. `.sermon.local.yaml` is
Git-ignored. Do not put credentials
in the committed example file or paste them into chat. Edit the local YAML:

```yaml
siteId: d3e23eb0-5924-40a9-b990-daa4f82cd0ee
speaker: '許健文長老'
title: '本周证道标题'
# Default author when no Wix member matches the speaker.
authorId: 'PASTE_MEMBER_ID_HERE'
categoryId: ''
```

YAML comments and blank optional values are supported. Configuration files must
use a `.yaml` or `.yml` extension; JSON config files are no longer supported.

Find a valid author ID from an existing sermon post:

```bash
./wix-post.sh --inspect-post 'https://www.cccgermantown.org/post/copy-of-%E6%B8%85%E7%90%86%E5%9C%A3%E6%AE%BF-20261011'
./wix-post.sh --list-categories
```

Set `authorId` in the root `.sermon.local.yaml` to the returned `memberId` as the
**fallback author**. This must be an existing Wix Blog author with the appropriate
role. Set `speaker` to the sermon speaker's display name; `--speaker` overrides
that YAML value. Set `title` to the plain sermon title, without a date suffix;
`--title` overrides that YAML value. Wix still appends `--YYYYMMDD` to its post
title. Both fields are also read by the [YouTube uploader](../youtube/README.md).
A missing or blank title is rejected unless overridden.

Author selection on a live creation run:

1. `--author-id`, then `WIX_AUTHOR_ID`, explicitly selects an author and skips lookup.
2. Otherwise, look up `speaker` among Wix members' display names (`profile.nickname`).
   Prefer an exact match; otherwise normalize Unicode, whitespace (including
   full-width spaces), and letter case. No fuzzy matching, title stripping, or
   traditional/simplified Chinese conversion is performed.
3. If no member matches, use YAML `authorId` and print an **Author fallback**
   message containing the speaker and selected ID. A matching speaker takes
   precedence over this configured default.
4. Multiple matching identities, lookup/API failures, or no match without a
   configured fallback stop the operation before creating a post.

The selected author ID is reported on stderr so offline JSON remains parseable.
The speaker remains unchanged in the post body even when a fallback author is used.
An existing member is not necessarily an eligible Blog author: configure the
speaker's author role in Wix first. The script does not create members or grant
roles. `--dry-run` stays offline, so it reports that lookup is deferred and any
configured fallback ID in its payload is provisional.

Leave `categoryId` blank to resolve `主日信息` by label automatically. If multiple
categories share that label (for example across languages), set the correct
`categoryId` from `--list-categories` or pass `--category-id` explicitly. The script
never creates categories. You may select another label with `--category`.

Other configuration options:

- Environment: `WIX_SITE_ID`, `WIX_AUTHOR_ID`, `WIX_CATEGORY_ID`, `WIX_API_KEY`.
- Site/category CLI IDs override environment variables, then local config values.
  Author selection follows the lookup/override/fallback rules above.
- `--config /path/to/config.yaml` selects another YAML config file (`.yml` is
  also supported).
- An optional `wixApiKey` string in the local config can hold the Wix key instead
  of the `WIX_API_KEY` environment variable. Protect that file with `chmod 600`
  and never commit it.
- The provided site ID is the built-in default. No account ID is needed.

### 3. Create a draft

Save any Scripture passage as a UTF-8 `passage.txt` (one paragraph per non-empty
line). Omit `--passage-file` and/or `--scripture` if not needed. You can also omit
`--speaker` and/or `--title` in the commands below when the corresponding values
are set in your YAML config.

```bash
./wix-post.sh \
    --date 20261018 \
    --title '本周证道标题' \
    --speaker '講員姓名' \
    --scripture '羅馬書 3:21–26' \
    --youtube 'https://www.youtube.com/watch?v=YOUR_VIDEO_ID' \
    --passage-file passage.txt
```

#### Featured / cover image already in Wix

Open **Media Manager** in Wix, select the image, and find its **Copy URL** option
(the exact menu location can vary). Use a direct image URL such as
`https://static.wixstatic.com/media/YOUR_IMAGE_ID.png`, not the URL of a blog page
or a `wix:image://...` reference.

Add these options to the creation command above (or to an offline preview):

```sh
    --cover-image-url 'https://static.wixstatic.com/media/YOUR_IMAGE_ID.png' \
    --cover-image-alt '描述本周证道封面'
```

If you already know the Wix Media image ID, use `--cover-image-id 'YOUR_IMAGE_ID'`
instead of `--cover-image-url`; these two options are mutually exclusive. The
media ID is an opaque file identifier, not the site's or author's UUID. The
script extracts this file ID from `--cover-image-url` and sends
`media.wixMedia.image.id` to Wix; a CDN URL alone may not bind the cover.
For example, this URL:

```text
https://static.wixstatic.com/media/9f045a_307a9c989ef54347be844c76c0c6c2ab~mv2.png
```

is equivalent to:

```sh
    --cover-image-id '9f045a_307a9c989ef54347be844c76c0c6c2ab~mv2.png'
```

The image must already exist in the target site's Media Manager. A publicly
accessible Wix CDN URL does not establish that the file belongs to that site.
If a draft was already created without a working cover, select the cover in
Wix Dashboard → Blog → Drafts. Rerunning the creation command does not update
existing drafts, and `--publish-draft` only publishes; it does not change media.

Alt text defaults to the sermon title when omitted. The script sets custom post
cover media with display enabled; it does not insert a duplicate image in the
body, upload/import images, or change Wix's blog layout settings. Omitting both
image options leaves the cover unspecified, so you can select one in Wix later.
Check the actual crop and appearance in a draft before publishing.

This prints the new draft ID. Review formatting, author, category, media links,
and the video in **Wix Dashboard → Blog → Drafts**, then publish there.
The sermon date appears in the title/body; Wix's publication timestamp is left
to Wix (it is not backdated or scheduled to the sermon date).

For immediate publication, add `--publish` to the creation command. This is a
public write operation; use it only after checking the inputs. To publish a
previously created draft without recreating it:

```bash
./wix-post.sh --publish --publish-draft YOUR_DRAFT_ID
```

### Duplicate protection and recovery

Posts use the deterministic URL slug `sermon-YYYYMMDD`, avoiding `copy-of-...`
URLs. Before creating, the script checks published posts for that slug or exact
title, and all draft pages for that slug or exact title. Matching posts cause an
error, not an update or an automatic publish. This supports **one scripted
sermon post per date**; older manually named posts with a different title/slug
must still be checked manually.

The check is not an atomic lock: do not run two creation commands for the same
Sunday concurrently. There are no automatic write retries. If a network failure
occurs, inspect the Wix dashboard before retrying, since Wix may have completed
the operation. If publishing fails after draft creation, use the printed draft ID
with `--publish --publish-draft` or publish in the dashboard. Existing drafts are
not overwritten by rerunning the creation command.

### Local verification

```bash
uv sync --locked
bash -n wix-post.sh
uv run --locked python -m py_compile wix_post.py test_wix_post.py
uv run --locked python -m unittest -v test_wix_post.py
```

Tests mock Wix; they do not create or publish posts. Live API compatibility and
visual formatting still require a draft test with your credentials.

API references: [Create Draft Post](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/create-draft-post),
[Publish Draft Post](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/publish-draft-post),
[Query Draft Posts](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/query-draft-posts),
[Query Posts](https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/query-posts),
[List Categories](https://dev.wix.com/docs/api-reference/business-solutions/blog/category/list-categories).
