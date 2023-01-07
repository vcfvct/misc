#!/usr/bin/env bash

# set d and sermon_dir
source ./date-dir.sh
# substring Year from yyyymmdd
year=${d:0:4}

echo copying mp4 file to S3
aws s3 cp ${sermon_dir}/${d}.mp4  s3://cccg-media/videos/sermon/${year}/ --acl public-read --storage-class INTELLIGENT_TIERING
echo video copied to S3

echo copying mp3 file to S3
aws s3 cp ${sermon_dir}/${d}.mp3 s3://cccg-media/audio/sermon/${year}/ --acl public-read --storage-class INTELLIGENT_TIERING
echo audio copied to s3
