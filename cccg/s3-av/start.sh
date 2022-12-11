#!/usr/bin/env bash

echo processing video...
./video-compress.sh

echo processing audio...
./audio-compress.sh

echo upload to S3...
./s3-upload.sh
