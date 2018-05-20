#!/usr/bin/env bash
d=`date +%Y%m%d`
echo output file: ${d}

HandBrakeCLI -i /media/lenovo/9016-4EF8/DCIM/393_0520 -o ~/Desktop/${d}.mp4 -f av_mp4 --ipod-atom -w 420 -l 240 --keep-display-aspect -e x264 -r 30 -q 22.0 -E copy:aac -B 64 -R 22.05 --mixdown stereo 
