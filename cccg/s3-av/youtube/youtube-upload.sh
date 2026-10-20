#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(dirname -- "${script_dir}")"
if ! command -v uv >/dev/null 2>&1; then
    echo 'Error: uv is required. Install uv, then run uv sync --locked (see README.md).' >&2
    exit 1
fi

exec uv run --locked --project "${project_dir}" python "${script_dir}/youtube_upload.py" "$@"
