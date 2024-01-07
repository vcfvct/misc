import glob
import os
import shutil

source_folder='/mnt/c/Users/Worship/Videos'
target_folder = '/mnt/c/Users/Worship/Documents/sermons'

files = glob.glob(f"{source_folder}/*.mp4")
new_file = max(files, key = os.path.getctime)

shutil.copy(new_file, f"{target_folder}/raw.mp4")
