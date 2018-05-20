#!/usr/bin/env bash
d=`date +%Y%m%d`
echo output file: ${d}

ffmpeg \
  -i /Volumes/sdcard/SOS_DATA/S001/MATERIAL/M000000_.WAV \
  -ac 1 -ar 16000 \
  -f mp3 ~/Desktop/${d}.mp3 

