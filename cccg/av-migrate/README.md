## Files for EBS to S3
* this need to be done by manually upload all legacy audio/video into s3 with all the folder-structure/path unchanged so that we can just replace the `public://` with `https://xxxx` in DB.
* top level audio file will be moved to `/audio/2015/`: `aws s3 cp ./ s3://cccg-media/audio/2015/ --exclude "*" --include "20*.mp3" --recursive --storage-class STANDARD_IA --dryrun`
* video copy to a legacy folder: `aws s3 cp ./ s3://cccg-media/videos/sermon/legacy/ --recursive --storage-class STANDARD_IA --dryrun`

## drupal db change
* Modify the `file_managed` table file `uri` column from something like `public://audio/2015/20180211.mp3` to `https://www.cccgermantown.org/s3/audio/2015/20180211.mp3`
  * may need a small java/nodejs script to manipuate as the file name pattern varies.
  * for video, replace `public://` with the `https://` stuff
  * for audio
    * uri start with `public://audio`, same thing , replace with https cccg stuff.
    * uri start with `public://20xxx` means it is not in the audio directory. These files will be uploaded the s3 audio 2015 folder so uri value should be `https:wwww.cccgermantown.org/s3/audio/2015/20xxxx`.
* after file uri change, need to clean the cache in `cache_field` table for those `cid='field:node:xxxx'`
  * to remove all cached fields, just do `TRUNCATE cache_field;`

## General DB
* should be able to clear all the cache\_xxx tables, which has significant size impact.
* `field_data_body` table has all the pod cast body content in its `body_value` column, `entity_id` + `revision_id` is the identifier
* `field_data_field_audio_type` table has the mapping for `entity_id` with `field_oc_audio_fid` which is the foreign key reference to the `file_managed` table.
* `field_revision_field_video` has the video file association to the `node` entity/revision id.
* `node` table has the `title` and *timestamp* info.  `nid` maps to entity_id, vid maps to revision_id.
* all the revision info is saved in the `field_revision_xxx` tables so it still can roll back to older versions if needed.
* was getting `linux-headers-aws : Depends: linux-headers-4.4.0-1063-aws but it is not going to be installed` error when try to install mysql-server locally, have to install the above thing first.

## Data extraction
* need to get:
  1. title
  2. podcast body
  3. audio file
  4. video file
  5. author
  6. date
  7. youtube(some podcasts)
