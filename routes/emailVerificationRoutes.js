const express = require('express');
const { requestEmailVerificationOTP, verifyEmail, isEmailVerified } = require('../controllers/emailVerificationController');

const router = express.Router();

router.post('/request/otp', requestEmailVerificationOTP);
router.post('/verify', verifyEmail)
router.get('/isVerified', isEmailVerified);

module.exports = router;