#!/usr/bin/env bash

today=`date +%Y%m%d`
year=`date +%Y`

sermon_dir=/mnt/c/Users/Worship/Documents/sermons

echo copying mp4 file to S3
aws s3 cp ${sermon_dir}/${today}.mp4  s3://cccg-media/videos/sermon/${year}/ --acl public-read --storage-class INTELLIGENT_TIERING
echo video copied to S3

echo copying mp3 file to S3
aws s3 cp ${sermon_dir}/${today}.mp3 s3://cccg-media/audio/sermon/${year}/ --acl public-read --storage-class INTELLIGENT_TIERING
echo audio copied to s3
