# Phone misc

## For Android 14+ with init_boot.img
[detail steps in droidwin](https://droidwin.com/how-to-root-oneplus-12-via-magisk-patched-init-boot/#STEP_7_Patch_OnePlus_12_Init_Bootimg_via_Magisk)

```sh
adb reboot bootloader
fastboot devices
fastboot flash init_boot magisk_patched_boot.img
```

## magisk stock backup does not exist
* This happens when patched boot img is flashed directly via `fastboot` instead of via OTA/magisk.
* The backup image is typically stored under `/data/magisk_backup_${SHA1}` where the `SHA1` is under `/dev/SomeString/.magisk/config.`  The Path can be retrieve with `cat $(magisk --path)/.magisk/config` according to [this gist](https://gist.github.com/pexcn/71d7d242c5e805d9346d2dc9db17fb90)
* The above commands can be executed using `Termux` Android app with `su` command to get *root* first.

## boot loop
* for boot loop caused by Magisk modules, hold volume-down and power will boot to safe mode and all the magisk modules will be disabled after reboot from safe mode, so that we can test which module is causing the boot loop.

## OnePlus 10T upgrade with root
1. Download update zip with Oxygen Updater
2. Unroot with Magisk app (restore images)
3. Install update using OPLocalUpdate apk (the one that does not auto reboot and lets you install zip from storage)
4. Use Magisk to install to inactive slot (After OTA)
5. Reboot

## pixel 6a
* platform tools [download url](https://dl.google.com/android/repository/platform-tools_r33.0.3-windows.zip). change the version in the url to the desired one according to the [release history](https://developer.android.com/studio/releases/platform-tools).
* [pixel flasher](https://github.com/badabing2005/PixelFlasher/releases).
* [download image](https://developers.google.com/android/images#bluejay).
* on windows, [download driver](https://developer.android.com/studio/run/win-usb) and install via `device manager` so that *fastboot* can find device.

## WSA
* install [custom wsa build with magisk](https://github.com/MustardChef/WSABuilds).
* module cannot be installed correctly, have to follow this [issue to copy modules from the 'modules_update' to `/data/adb/modules/(yeur installed module)`](https://github.com/MustardChef/WSABuilds/issues/154#issuecomment-1729105000).  And this is the [original tutorial video in bilibil](https://www.bilibili.com/video/BV1GV4y1v7ys/).
* enable `share user folders` feature in WSA Advanced settings so that windows home folder is available in Android.
* When Windows behaves odd, download the Windows 11 `Disk Image (ISO) for x64 devices`, then run the `setup.exe` inside the ISO file to do in-place update.

## syncthing
[Reference thread](https://forum.syncthing.net/t/setting-up-multiple-phones-to-sync-to-an-og-google-pixel-for-google-photos-unlimited/16857).
1. install syncthing-folk on both devices.
2. on receiving device, add the sending device.
3. on sending device, Add the target folder that needs to be synced and set it to `Send Only`.
4. The receiving device should now receive a `push notification`. Accept the push notification, select target folder and set it to `Receive Only`.
