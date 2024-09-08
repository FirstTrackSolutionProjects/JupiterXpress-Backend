const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID_,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_,
  region: process.env.AWS_REGION_,
});

exports.handler = async (event, context) => {
  const { filename, filetype } = event.body;
  const params = {
    Bucket: process.env.S3_BUCKET_NAME_,
    Key: filename,
    Expires: 60, 
    ContentType: filetype,
    ACL: 'private', 
  };

  try {
    const uploadURL = await s3.getSignedUrlPromise('putObject', params);
    return {
      status:200, uploadURL
    };
  } catch (error) {
    console.error(error);
    return {
      status:500, error: 'Could not generate signed URL'
    };
  }
};
