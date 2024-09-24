const express = require('express');
const { requestOTPForgotPassword, verifyOTPandResetPassword } = require('../controllers/passwordController');

const router = express.Router();

router.post('/forgot/otp', requestOTPForgotPassword);
router.post('/forgot/reset', verifyOTPandResetPassword);

module.exports = router;