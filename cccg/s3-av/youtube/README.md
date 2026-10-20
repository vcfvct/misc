# YouTube sermon uploads

Run the examples below from the project root (`s3-av/`). This standalone uploader
uses the existing root `pyproject.toml`, `uv.lock`, and `.venv/`; no separate venv
or pip installation is needed. The wrapper finds the project regardless of the
working directory. Relative file/config overrides are relative to your shell's
working directory. The S3/compression scripts and Wix workflow are unchanged.

## Credentials and first authorization

In the Google Cloud project with **YouTube Data API v3** enabled:

1. Configure Google Auth Platform branding and audience. For an External app in
   Testing, add the Google login email that can authorize your channel under
   **Audience → Test users**.
2. Add `https://www.googleapis.com/auth/youtube.upload` under **Data Access**.
3. Create a **Desktop app** OAuth client and download its JSON as
   `youtube/client_secret.local.json` (not `.json.json`). No manually registered
   redirect URI or API key is needed. Service accounts are not supported.
4. Run:

```sh
uv sync --locked
./youtube/youtube-upload.sh --auth-only
```

Choose the intended Google account and YouTube/Brand Account channel in the
browser. Check the consent screen carefully: the tool requests upload access,
not permission to list/read all channel data, and does not independently verify
which channel you selected. It does not upload anything in `--auth-only` mode.

The browser redirects to a temporary localhost port. Authorization times out
after five minutes. In WSL, if the browser does not open automatically:

```sh
./youtube/youtube-upload.sh --auth-only --no-browser
```

Open the printed URL in the Windows browser on the same computer. Leave the
command running until the localhost redirect completes. If localhost forwarding
is unavailable, fix that first; do not paste authorization codes into chat or
use the retired out-of-band OAuth flow. A remote machine requires secure local
port forwarding; this is primarily a local/WSL tool.

The refresh token is saved to `youtube/token.local.json` with owner-only
permissions. Credentials, tokens, and local upload receipts are Git-ignored.
Keep the token private: it grants access to your channel. Custom paths selected
with `--client-secrets`, `--token`, or `--state-dir` are not automatically
Git-ignored; keep those outside the repository or add appropriate ignore rules.
Do not copy tokens/credentials into the shared YAML or committed example.

External apps in **Testing** normally have seven-day refresh-token expiration
for the upload scope. If refresh fails or you need to switch accounts/channels:

```sh
./youtube/youtube-upload.sh --auth-only --reauthorize
```

For ongoing weekly use, review moving the OAuth app to Production and any Google
verification requirements. OAuth app publishing and a video's privacy are
separate settings. If a channel is a delegated/manager account and authorization
fails, use an account eligible to authorize that channel through the API.
Ensure the YouTube channel is verified for uploads longer than 15 minutes.

## Preview offline

The root `.sermon.local.yaml` supplies the same `title` and `speaker` used by Wix.
CLI values override YAML. No YouTube-specific YAML fields are required, and Wix
credentials are never included in the YouTube payload. Both tools share config
and date validation in `sermon_common.py`.

```sh
./youtube/youtube-upload.sh \
    --date 20261018 \
    --file '/mnt/c/Users/YourName/Documents/sermons/20261018.mp4' \
    --dry-run
```

Preview validates the local MP4 exists and is non-empty, but does not inspect
its contents, authorize, write tokens/receipts, or make API calls. It prints the
proposed payload. `uv` may need network access to install dependencies initially.

Generated title: `因信称义--20261018 | 許健文長老` (using your YAML values).
YouTube's 100-character title limit includes the date and speaker. The description
contains the sermon date, plain title, and speaker. Optional overrides/additions:

```sh
    --title '因信称义' \
    --speaker '許健文長老' \
    --scripture '羅馬書 3:21–26' \
    --description-file passage.txt
```

The description file is appended as UTF-8 text. Descriptions are limited to 5000
UTF-8 bytes. Angle brackets are rejected in titles/descriptions. Sermon dates
are explicit `YYYYMMDD` values; the script does not silently use today's date.

## Upload privately first

Replace `--dry-run` with `--upload`:

```sh
./youtube/youtube-upload.sh \
    --date 20261018 \
    --file '/mnt/c/Users/YourName/Documents/sermons/20261018.mp4' \
    --upload
```

Defaults:

- **Private** visibility. Explicit `--privacy unlisted` or `--privacy public`
  changes the request; prefer reviewing your first upload in YouTube Studio.
- Category **29: Nonprofits & Activism**. Override with `--category-id` using a
  numeric YouTube category ID, not the Wix category UUID.
- **Not made for kids**. You are responsible for the correct audience declaration;
  use `--made-for-kids` when appropriate. This is about the intended audience,
  not whether the content is family-friendly.
- Subscriber notifications disabled (`notifySubscribers=false`).
- Resumable transfer in 8 MiB chunks, with progress on stderr and no automatic
  failed-request retries. Sessions are not persisted for cross-process resume.

Success prints JSON containing the video ID, watch URL, and returned privacy.
It means the transfer succeeded, not necessarily that processing has completed.
Review processing, playback, channel, audience, and visibility in YouTube Studio.
YouTube/account/project policies may prevent the requested visibility; check
Studio rather than assuming `--privacy public` guarantees a public video.

Pass the resulting watch URL into the existing Wix script's `--youtube` option.
Private videos will not play for ordinary site visitors; make the video unlisted
or public when ready **before publishing the Wix post**. The tool does not
publish to Wix, add playlists/thumbnails, schedule publication, or change an
existing YouTube video's visibility.

## Duplicate protection and recovery

Before initiating a transfer, an exclusive local receipt is created at
`youtube/.uploads/YYYYMMDD.json`. A second run for that date is blocked, including
when the title changes. On success the receipt contains the video ID and URL.
This is local duplicate protection only: it does not find earlier manual uploads
or uploads made from another checkout/computer. Keep the receipts and do not
bypass protection by changing state directories or sermon dates.

If an upload fails or is interrupted, the receipt stays **pending**. The outcome
may be ambiguous: check YouTube Studio for the video before retrying. If the video
exists, use it and retain the receipt. Only after verifying there is no existing
video should you manually remove that date's receipt and rerun. An invalid upload
or quota error can also leave a pending receipt; it is deliberately not removed
automatically. If disk saving fails after success, the video ID/URL is printed
before the receipt update is attempted. Do not blindly rerun.

Use `--help` for all options. Authorization errors do not print credential-bearing
responses; confirm test-user access, Desktop client type, scope, token expiration,
and channel eligibility in the Google consoles.

## Local verification

```sh
uv sync --locked
bash -n youtube/youtube-upload.sh wix/wix-post.sh
uv run --locked python -m py_compile sermon_common.py youtube/youtube_upload.py wix/wix_post.py
uv run --locked python -m unittest discover -s youtube -p 'test_*.py' -v
uv run --locked python -m unittest discover -s wix -p 'test_*.py' -v
```

Tests use temporary files and mocked Google clients; they do not read your OAuth
JSON, sign in, or upload anything. Live OAuth and API compatibility still need a
manual private-upload test.

References: [OAuth for Desktop apps](https://developers.google.com/identity/protocols/oauth2/native-app),
[Upload a video](https://developers.google.com/youtube/v3/guides/uploading_a_video),
[Videos: insert](https://developers.google.com/youtube/v3/docs/videos/insert).
