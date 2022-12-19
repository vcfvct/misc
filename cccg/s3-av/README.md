# Weekly Audio/Video handling
1. save the video from zoom cloud to local disk
2. use av tool to cut the sermon section and saved as `raw.mp4` to Windows' `Documents\sermons\`.
3. run `start.sh` in WSL. It would do 3 things:
  * compress the video from `raw.mp4` and save it with today's date(from example `20221228.mp4`) to the same directory.
  * compress the audio from `raw.mp4` and save it with today's date(from example `20221228.mp3`) to the same directory.
  * upload both the audio and video to our S3 bucket's video and audio directory with correct prefix year etc.
