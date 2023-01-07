#!/usr/bin/env bash

# set d and sermon_dir
source ./date-dir.sh

echo output file: ${d}
# vbr(-q): https://trac.ffmpeg.org/wiki/Encode/MP3
ffmpeg \
  -i ${sermon_dir}/${d}.mp4 \
  -ac 1 -ar 16000 -q:a 9 \
  -f mp3 ${sermon_dir}/${d}.mp3 


