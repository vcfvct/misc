#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source "${script_dir}/date-dir.sh"

python3 "${script_dir}/copy_new_video.py" --target-dir "${sermon_dir}"
exec "${script_dir}/start.sh" -d "${d}" -f "${sermon_dir}"
