
import { S3Client, CopyObjectCommand, ListObjectsCommand, ObjectStorageClass } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

const bucketName = 'cccg-media';

const updateObjectStorageClass = async (objectKey: string): Promise<void> => {
  const params = {
    Bucket: bucketName,
    CopySource: `${bucketName}/${objectKey}`,
    Key: objectKey,
    StorageClass: ObjectStorageClass.INTELLIGENT_TIERING,
  };

  try {
    await s3.send(new CopyObjectCommand(params));
    console.log(`Updated object "${objectKey}" storage class to Intelligent-Tiering`);
  } catch (error) {
    console.error(`Error updating object "${objectKey}" storage class: ${error}`);
  }
};

const updateObjectStorageClasses = async (Prefix: string): Promise<void> => {
  const params = {
    Bucket: bucketName,
    Prefix,
  };

  try {
    const data = await s3.send(new ListObjectsCommand(params));
    // filter the list of object keys to include only those with .mp3 or .mp4 file extensions
    const mp3AndMp4ObjectKeys = data.Contents.
      filter(o => {
        const lowerKey = o.Key.toLowerCase();
        if(!(lowerKey.endsWith('mp3') || lowerKey.endsWith('mp4'))) return false;
        if (o.StorageClass === ObjectStorageClass.INTELLIGENT_TIERING) return false;
        return true;
      }).
      map((object) => object.Key);

    await Promise.all(mp3AndMp4ObjectKeys.map(updateObjectStorageClass));

    console.log(`Updated ${mp3AndMp4ObjectKeys.length} objects to Intelligent-Tiering storage class`);
  } catch (error) {
    console.error(`Error updating object storage classes: ${error}`);
  }
};

// updateObjectStorageClasses('audio/');
// updateObjectStorageClasses('videos/');
