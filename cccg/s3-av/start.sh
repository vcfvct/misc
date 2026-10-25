#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source "${script_dir}/date-dir.sh"

if [[ ! -s "${sermon_dir}/raw.mp4" ]]; then
    echo "Error: expected a non-empty ${sermon_dir}/raw.mp4." >&2
    exit 1
fi
if ! command -v uv >/dev/null 2>&1; then
    echo 'Error: uv is required. Run uv sync --locked before starting.' >&2
    exit 1
fi

echo "using date: ${d}"
echo "using sermon directory: ${sermon_dir}"

echo processing video...
"${script_dir}/video-compress.sh" -d "${d}" -f "${sermon_dir}"

echo processing audio...
"${script_dir}/audio-compress.sh" -d "${d}" -f "${sermon_dir}"

echo upload to S3...
"${script_dir}/s3-upload.sh" -d "${d}" -f "${sermon_dir}"

echo uploading raw.mp4 to YouTube...
youtube_result="$("${script_dir}/youtube/youtube-upload.sh" \
    --date "${d}" --file "${sermon_dir}/raw.mp4" --upload)"
echo "${youtube_result}"
youtube_url="$(uv run --locked --project "${script_dir}" python -c \
    'import json, sys; print(json.loads(sys.argv[1])["url"])' "${youtube_result}")"

echo creating Wix draft...
"${script_dir}/wix/wix-post.sh" --date "${d}" --youtube "${youtube_url}"

echo 'Done. Review the private YouTube video and make it unlisted/public before publishing the Wix draft.'
