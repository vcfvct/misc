# Phone misc

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
