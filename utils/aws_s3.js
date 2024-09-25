const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_,
    region: process.env.AWS_REGION_,
  });

module.exports = {s3}