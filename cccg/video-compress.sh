#!/usr/bin/env bash
d=`date +%Y%m%d`
echo output file: ${d}

HandBrakeCLI \
  -i /media/lenovo/SDCARD/DCIM/400_0708/MVI_0608.MP4 \
  -o /media/lenovo/TI106412W0C/${d}.mp4 \
  -f av_mp4 -w 418 --loose-anamorphic --modulus 2 --keep-display-aspect \
  -e x264 -r 30 -q 22.0 --pfr --encoder-profile Baseline --encoder-level 4.0 \
  -E av_aac -B 64 -R 22.05 --mixdown stereo 


