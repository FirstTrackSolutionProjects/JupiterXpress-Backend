const express = require('express');
const { requestEmailVerificationOTP, verifyEmail } = require('../controllers/emailVerificationController');

const router = express.Router();

router.post('/request/otp', requestEmailVerificationOTP);
router.post('/verify', verifyEmail)

module.exports = router;