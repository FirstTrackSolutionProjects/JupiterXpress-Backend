const { s3 } = require('../utils/aws_s3');

const getGetSignedUrl = async (req, res) => {
    const { key } = req.body;
    const params = {
        Bucket: process.env.S3_BUCKET_NAME_,
        Key: key,
        Expires: 60,
    };

    try {
        const downloadURL = await s3.getSignedUrlPromise('getObject', params);
        return res.status(200).json({
            status: 200, downloadURL
        });
    } catch (error) {
        return res.status(500).json({
            status: 500, error: 'Could not generate signed URL'
        });
    }
}

const getPutSignedUrl = async (req, res) => {
    const { filename, filetype, isPublic } = req.body;
    const params = {
        Bucket: process.env.S3_BUCKET_NAME_,
        Key: filename,
        Expires: 60,
        ContentType: filetype,
        ACL: isPublic?'public-read':'private'
    };

    try {
        const uploadURL = await s3.getSignedUrlPromise('putObject', params);
        return res.status(200).json({
            status: 200, uploadURL
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: 500, error: 'Could not generate signed URL'
        });
    }
}

module.exports = {
    getGetSignedUrl,
    getPutSignedUrl
}