#!/usr/bin/env bash
# set d and sermon_dir
source ./date-dir.sh

echo output file date: ${d}

HandBrakeCLI \
  -i ${sermon_dir}/raw.mp4 \
  -o ${sermon_dir}/${d}.mp4 \
  -f av_mp4 -w 418 --loose-anamorphic --modulus 2 --keep-display-aspect \
  -e x264 -r 30 -q 22.0 --pfr --encoder-profile Baseline --encoder-level 4.0 \
  -E av_aac -B 64 -R 22.05 --mixdown stereo


