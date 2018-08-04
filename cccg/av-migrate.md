## Files for EBS to S3
* this need to be done by manually into each year folder in s3

## drupal db change
* Modify the `file_managed` table file `uri` column from something like `public://audio/2015/20180211.mp3` to `https://www.cccgermantown.org/s3/audio/sermon/2018/20180729.mp3`
  * may need a small java/nodejs script to manipuate as the file name pattern varies.
* after file uri change, need to clean the cache in `cache_field` table for those `cid='field:node:xxxx'`

## Gerneral DB
* should be able to clear all the cache\_xxx tables, which has significant size impact.
* `field_data_body` table has all the pod cast body content in its `body_value` column, `entity\_id` is the identifier
* `field_data_audio` table has the mapping for `entity_id` with `field_oc_audio_fid` which is the foreign key reference to the `file_managed` table.
* all the revision info is saved in the `field_revision_xxx` tables so it still can roll back to older versions if needed.
