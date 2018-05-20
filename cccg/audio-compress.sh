#!/usr/bin/env bash
d=`date +%Y%m%d`
echo output file: ${d}
# vbr(-q): https://trac.ffmpeg.org/wiki/Encode/MP3
ffmpeg \
  -i /Volumes/sdcard/SOS_DATA/S001/MATERIAL/M000000_.WAV \
  -ac 1 -ar 16000 -q:a 9 \
  -f mp3 ~/Desktop/${d}.mp3 

