#!/usr/bin/env bash

while getopts d:f: flag
do
    case "${flag}" in
        d) d=${OPTARG};;
        f) sermon_dir=${OPTARG};;
    esac
done

# use today's date if no argument is provided
[ -z "$d" ] && d=`date +%Y%m%d`
# use Windows Documents sermons directory if no argument is provided
[ -z "$sermon_dir" ] && sermon_dir=$(wslpath "$(wslvar USERPROFILE)")/Documents/sermons
