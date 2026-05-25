# Church AV Recording SOP

This guide explains how to set up the church laptop, camera, ATEM Mini, projector, worship team monitor, OBS recording, and sermon video upload process.

## Device Connection Diagram

```mermaid
flowchart LR
    Laptop[Church Laptop]
    Splitter[HDMI Splitter]
    Projector[Projector\nVGA input]
    Monitor[Worship Team Monitor]
    Atem[ATEM Mini]
    Camera[Camera]
    Mixer[Yamaha Mixing Console]
    Remote[Slide Remote Control]

    Laptop -- USB-C --> Atem
    Laptop -- HDMI --> Splitter
    Laptop -- USB-A power --> Splitter
    Laptop -- USB-A --> Remote
    Laptop -. optional 3.5 mm audio for YouTube playback .-> Mixer

    Splitter -- HDMI to VGA --> Projector
    Splitter -- HDMI --> Monitor

    Camera -- HDMI --> Atem
    Mixer -- 3.5 mm audio cable --> Atem
```

Simple explanation:

- The **laptop** sends slides to the projector and worship team monitor through the **HDMI splitter**.
- The **camera** and **sound from the Yamaha Mixing Console** go into the **ATEM Mini**.
- The **ATEM Mini** sends camera and sound to the laptop through **USB-C**.
- The **slide remote** connects directly to the laptop by **USB-A**.
- Optional: the **laptop** can send audio back to the **Yamaha Mixing Console** when playing YouTube or other laptop audio through the church sound system.

## 1. Hardware Setup

### Laptop Connections

Connect the laptop to the following devices:

1. Connect the laptop to the **ATEM Mini** using **USB-C**.
2. Connect the laptop to the **HDMI splitter** using HDMI.
3. Connect the HDMI splitter power cable to the laptop using **USB-A**.
4. Connect the **remote control** to the laptop using **USB-A**.
5. Optional: connect the laptop audio output to the **Yamaha Mixing Console** when laptop audio needs to play through the church sound system, such as YouTube playback.

### HDMI Splitter Connections

The HDMI splitter sends the laptop screen to both the projector and the worship team monitor.

1. Connect one HDMI output from the splitter to the **projector**.
2. The projector uses a **VGA input**, so use the HDMI-to-VGA connection as needed.
3. Connect the other HDMI output from the splitter to the **worship team monitor**.

### ATEM Mini Connections

The ATEM Mini handles the camera and sound input for recording.

1. Connect the **camera** to the ATEM Mini using HDMI.
2. Connect the **Yamaha Mixing Console** to the ATEM Mini using the **3.5 mm audio cable**.
3. Confirm the ATEM Mini is connected to the laptop by USB-C.

### Camera Setup

1. Turn on the camera.
2. Make sure the camera is connected to the ATEM Mini by HDMI.
3. Position the camera so the preacher is centered in the frame.

## 2. Software Setup Before Service

### Download Sermon Slides

1. Open **Microsoft Edge**.
2. Go to **Gmail**.
3. Download the sermon slides from the church email.

### Prepare Regular Slides

1. Open **Google Drive**.
2. Open or prepare the regular church slides.
3. Make sure all slides are ready before the service starts.

### Set Windows Display Mode

The laptop and projector/monitor should be set up in **Extended Mode**.

1. Confirm that the projector and worship team monitor are showing the extended screen.
2. If a window opens on the wrong screen, use:

```text
Win + Shift + Left Arrow
```

or

```text
Win + Shift + Right Arrow
```

This moves the current window between the laptop screen and the projector screen.

## 3. OBS Setup

1. Open **OBS**.
2. Use the **Desktop + Camera** scene/mode.
3. Confirm the slide view takes about **2/3 of the screen on the left**.
4. Confirm the camera view takes about **1/3 of the screen on the right**.
5. Adjust the camera if needed so the preacher is centered.
6. Check that audio is coming from the Yamaha Mixing Console through the ATEM Mini.
7. Verify the sermon slides are visible correctly in OBS.

## 4. Remote Control Check

Before the sermon starts:

1. Confirm the remote control is connected to the laptop.
2. Open the sermon slides.
3. Test the remote by moving forward and backward through the slides.
4. Make sure the slides change on the projector/monitor.

## 5. Recording the Sermon

1. Wait until the worship song has ended.
2. Before the sermon/preaching starts, click **Record** in OBS.
3. During the sermon, monitor:
   - Slides are changing correctly.
   - Camera is still centered on the preacher.
   - Audio is still coming through.
4. After the sermon/preaching ends, click **Stop Recording** in OBS.

## 6. Sermon Video Handling

### YouTube Upload

Upload the sermon video recorded that Sunday. The YouTube upload process is [documented separately here](https://docs.google.com/document/d/1eAYi8r99xt1t5ldxOCHRCEqZuF5ntq3fRUUrI0reWDE/edit?usp=sharing).

## 7. Audio/Video Upload to AWS S3

The AWS S3 upload process uses a script inside WSL. The script handles the audio and video compression automatically, so normally no manual compression steps are needed.

The script will:

1. Find the latest video from the Windows **Videos** folder.
2. Extract and compress the audio using `ffmpeg`.
3. Compress the video using `HandBrakeCLI`.
4. Upload the audio and video files to AWS S3 using today's date.
5. More details about the exact compression settings and upload process are available in the `s3-av` folder.

### Steps to Run the Upload Script

1. Open the **Terminal** app.
2. It should open **WSL** automatically.
3. Type:

```bash
z av
```

This should navigate to the AV folder containing the upload script.

4. Run the script:

```bash
./copy-and-start.sh
```

Tip: Fish shell auto-completion should help, so you may not need to type the whole command.

## 8. Troubleshooting

### Camera Does Not Show in OBS

If the camera was connected after OBS was already open, OBS may not detect it automatically.

1. Confirm the camera is turned on.
2. Confirm the camera HDMI cable is connected to the ATEM Mini.
3. Confirm the ATEM Mini is connected to the laptop by USB-C.
4. Close OBS completely.
5. Reopen OBS and check the camera view again.

## 9. Final Checklist

Before the sermon:

- Laptop is connected to ATEM Mini by USB-C.
- HDMI splitter is connected to laptop.
- HDMI splitter power is connected to laptop USB-A.
- Projector is connected and working.
- Worship team monitor is connected and working.
- Camera is connected to ATEM Mini.
- Yamaha Mixing Console audio is connected to ATEM Mini.
- Remote control is connected and tested.
- Windows display mode is set to Extended.
- OBS is open and showing slides plus camera.
- Preacher is centered in the camera view.
- Audio is working in OBS.

During the sermon:

- Start recording after worship and before preaching begins.
- Watch slides, camera, and audio during recording.

After the sermon:

- Stop recording in OBS.
- Follow the separate YouTube upload document.
- Run the WSL script to upload audio/video to AWS S3.
