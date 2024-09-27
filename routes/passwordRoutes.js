const express = require('express');
const { requestOTPForgotPassword, verifyOTPandResetPassword, changePassword } = require('../controllers/passwordController');

const router = express.Router();

router.post('/forgot/otp', requestOTPForgotPassword);
router.post('/forgot/reset', verifyOTPandResetPassword);
router.post('/change', changePassword)

module.exports = router;