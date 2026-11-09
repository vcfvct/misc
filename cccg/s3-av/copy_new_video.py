import argparse
import glob
import os
import shutil

source_folder='/mnt/c/Users/Worship/Videos'
parser = argparse.ArgumentParser(description='Copy the newest local MP4 to raw.mp4.')
parser.add_argument('--target-dir', default='/mnt/c/Users/Worship/Documents/sermons')
target_folder = parser.parse_args().target_dir

# Get all .mp4 files (case-insensitive) 
mp4_files = glob.glob(f"{source_folder}/*.mp4") 
MP4_files = glob.glob(f"{source_folder}/*.MP4") 
# Combine both lists 
all_mp4_files = mp4_files + MP4_files 
# Find the most recently created file in the combined list 
if not all_mp4_files:
    parser.error('No MP4 files found in ' + source_folder)
newest_mp4_file = max(all_mp4_files, key=os.path.getctime)

print(newest_mp4_file)

shutil.copy(newest_mp4_file, f"{target_folder}/raw.mp4")
