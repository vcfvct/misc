#!/usr/bin/env bash
d=`date +%Y%m%d`
echo output file: ${d}

HandBrakeCLI \
  -i /media/lenovo/9016-4EF8/DCIM/393_0520 \
  -o ~/Desktop/${d}.mp4 \
  -f av_mp4 -w 418 --loose-anamorphic --modulus 2 --keep-display-aspect \
  -e x264 -r 30 -q 22.0 --pfr --encoder-profile Baseline --encoder-level 4.0 \
  -E av_aac -B 64 -R 22.05 --mixdown stereo 
