# Weekly Audio/Video handling
1. save the video from zoom cloud to local disk
2. use av tool to cut the sermon section and saved as `raw.mp4` to Windows' `Documents\sermons\`.
3. run `start.sh` in WSL. It would do 3 things:
  * compress the video from `raw.mp4` and save it with today's date(from example `20221228.mp4`) to the same directory.
  * compress the audio from `raw.mp4` and save it with today's date(from example `20221228.mp3`) to the same directory.
  * upload both the audio and video to our S3 bucket's video and audio directory with correct prefix year etc.

## Options

### -d
By default the `start.sh` will use *today*'s date which is our typical Sunday worship date for the video/audio file name as well as the path at S3. If we need to process some other dates, use the `-d` argument with *yyyyMMDD*. for example: `./start.sh -d 20220101`.

### -f
By default the `start.sh` will use `{windowsHomeDirectory}\Documents\sermons` as the default directory to look for the raw.mp4 and place the output mp4s. To override this, use `-f` to pass the folder argument, for example `start.sh -f /mnt/c/Users/YourName/Documents/YourOtherDirs`.

## Wix Sunday sermon posts

Wix posting scripts and tests live in [`wix/`](wix/README.md). Shared config,
Python dependencies (`pyproject.toml`, `uv.lock`), and `.venv/` live at the root,
shared with the [`youtube/` uploader](youtube/README.md), including title and
speaker settings. The media-processing scripts above remain at the root.

From this directory:

```sh
./wix/wix-post.sh --help
uv sync --locked
```

The shared local config is `.sermon.local.yaml` at the root and remains Git-ignored;
the example is `sermon.config.example.yaml`. Its `title` and `speaker` settings are
shared with YouTube tooling, while service credentials use service-specific
keys such as `wixApiKey`. See the
[Wix setup and usage guide](wix/README.md) for creation, preview, and author lookup.

Run the Wix tests using the shared environment:

```sh
uv run --locked python -m unittest discover -s wix -p 'test_*.py' -v
```

## YouTube sermon uploads

The [`youtube/` guide](youtube/README.md) covers Desktop OAuth setup, offline
preview, private uploads, and recovery. It uses the same root uv environment and
`.sermon.local.yaml` title/speaker settings; no separate environment is needed.

```sh
./youtube/youtube-upload.sh --auth-only
./youtube/youtube-upload.sh --date 20261018 --file /path/to/20261018.mp4 --dry-run
# Replace --dry-run with --upload after reviewing the preview (default: private).
```

OAuth credentials and generated tokens stay local and Git-ignored. Local receipts
block repeat uploads for the same sermon date. Review the video in YouTube Studio
and make it available to viewers before publishing its URL through Wix.
`start.sh` does not invoke YouTube or Wix automatically.

```sh
uv run --locked python -m unittest discover -s youtube -p 'test_*.py' -v
```
