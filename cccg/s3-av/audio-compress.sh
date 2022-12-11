#!/usr/bin/env bash
d=`date +%Y%m%d`
sermon_dir=/mnt/c/Users/Worship/Documents/sermons
echo output file: ${d}
# vbr(-q): https://trac.ffmpeg.org/wiki/Encode/MP3
ffmpeg \
  -i ${sermon_dir}/${d}.mp4 \
  -ac 1 -ar 16000 -q:a 9 \
  -f mp3 ${sermon_dir}/${d}.mp3 


