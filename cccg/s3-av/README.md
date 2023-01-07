# Weekly Audio/Video handling
1. save the video from zoom cloud to local disk
2. use av tool to cut the sermon section and saved as `raw.mp4` to Windows' `Documents\sermons\`.
3. run `start.sh` in WSL. It would do 3 things:
  * compress the video from `raw.mp4` and save it with today's date(from example `20221228.mp4`) to the same directory.
  * compress the audio from `raw.mp4` and save it with today's date(from example `20221228.mp3`) to the same directory.
  * upload both the audio and video to our S3 bucket's video and audio directory with correct prefix year etc.

## Options

### -d 
By default the `start.sh` will use *today*'s date which is our typical Sunday worship date for the video/audio file name as well as the path at S3. If we need to process some other dates, use the `-d` argument with *yyyyMMDD*. for example: `./start.sh -d 20220101`.

### -f
By default the `start.sh` will use `{windowsHomeDirectory}\Documents\sermons` as the default directory to look for the raw.mp4 and place the output mp4s. To override this, use `-f` to pass the folder argument, for example `start.sh -f /mnt/c/Users/YourName/Documents/YourOtherDirs`.
