const express = require('express');
const { getGetSignedUrl } = require('../controllers/s3Controller');

const router = express.Router();

router.post('/getUrl', getGetSignedUrl);

module.exports = router;