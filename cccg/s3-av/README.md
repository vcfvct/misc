# Weekly Audio/Video handling
1. save the video from zoom cloud to local disk
2. use av tool to cut the sermon section and saved as `raw.mp4` to Windows' `Documents\sermons\`.
3. Configure YouTube OAuth and Wix access using the guides below, set the sermon
   `title` and `speaker` in `.sermon.local.yaml`, and run `uv sync --locked`.
4. Run `./start.sh` in WSL. It runs these steps in order and stops on any error:
  * compress the video from `raw.mp4` and save it with today's date(from example `20221228.mp4`) to the same directory.
  * compress the audio from `raw.mp4` and save it with today's date(from example `20221228.mp3`) to the same directory.
  * upload both the compressed audio and video to our S3 bucket's video and audio directories.
  * upload the original `raw.mp4` to YouTube as a **private** video (not the compressed MP4).
  * pass the returned YouTube URL to Wix and create a **draft** with the S3 download links.

```sh
./start.sh -d 20261018 -f '/mnt/c/Users/YourName/Documents/sermons'
```

The input must already be copied/trimmed to `raw.mp4` in the selected folder;
this script does not download or copy from Zoom. It requires HandBrakeCLI,
ffmpeg, the AWS CLI, and uv, plus configured service credentials.
Review the YouTube video and make it unlisted/public before publishing the Wix
draft. Upload completion does not mean YouTube has finished processing.

If a later step fails, use the standalone tools below to finish that step rather
than rerunning the whole pipeline. YouTube receipts block duplicate uploads for
the date; do not delete them blindly. The YouTube result URL is printed before
Wix runs and is also saved in `youtube/.uploads/YYYYMMDD.json`.

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
`start.sh` invokes both automatically, using `raw.mp4` for YouTube and creating
only a Wix draft. The standalone commands remain available for previews and recovery.

```sh
uv run --locked python -m unittest discover -s youtube -p 'test_*.py' -v
uv run --locked python -m unittest -v test_start
```

The entry-point tests mock compression and upload commands; no real uploads occur.
