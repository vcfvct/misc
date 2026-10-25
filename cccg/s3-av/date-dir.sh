#!/usr/bin/env bash

while getopts d:f: flag
do
    case "${flag}" in
        d) d=${OPTARG};;
        f) sermon_dir=${OPTARG};;
    esac
done

# use today's date if no argument is provided
if [[ -z "${d:-}" ]]; then
    d=$(date +%Y%m%d)
fi
# use Windows Documents sermons directory if no argument is provided
if [[ -z "${sermon_dir:-}" ]]; then
    sermon_dir="$(wslpath "$(wslvar USERPROFILE)")/Documents/sermons"
fi
