import glob
import os
import shutil

source_folder='/mnt/c/Users/Worship/Videos'
target_folder = '/mnt/c/Users/Worship/Documents/sermons'

# Get all .mp4 files (case-insensitive) 
mp4_files = glob.glob(f"{source_folder}/*.mp4") 
MP4_files = glob.glob(f"{source_folder}/*.MP4") 
# Combine both lists 
all_mp4_files = mp4_files + MP4_files 
# Find the most recently created file in the combined list 
newest_mp4_file = max(all_mp4_files, key=os.path.getctime)

print(newest_mp4_file)

shutil.copy(newest_mp4_file, f"{target_folder}/raw.mp4")
