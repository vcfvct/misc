#!/usr/bin/env bash

# set d and sermon_dir
source ./date-dir.sh

echo using date: $d
echo using sermon directory: $sermon_dir

echo processing video...
./video-compress.sh -d ${d} -f ${sermon_dir}

echo processing audio...
./audio-compress.sh -d ${d} -f ${sermon_dir}

echo upload to S3...
./s3-upload.sh -d ${d} -f ${sermon_dir}
