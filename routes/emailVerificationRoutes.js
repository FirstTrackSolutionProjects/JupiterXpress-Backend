const express = require('express');
const { requestEmailVerificationOTP } = require('../controllers/emailVerificationController');

const router = express.Router();

router.post('/request/otp', requestEmailVerificationOTP);

module.exports = router;