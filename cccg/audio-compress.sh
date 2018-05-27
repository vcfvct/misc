#!/usr/bin/env bash
d=`date +%Y%m%d`
echo output file: ${d}
# vbr(-q): https://trac.ffmpeg.org/wiki/Encode/MP3
ffmpeg \
  -i /media/lenovo/SDCARD/SOS_DATA/S002/MATERIAL/M000000_.WAV \
  -ac 1 -ar 16000 -q:a 9 \
  -f mp3 /media/lenovo/TI106412W0C/${d}.mp3 


