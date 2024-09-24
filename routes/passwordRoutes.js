const express = require('express');
const { requestOTPForgotPassword } = require('../controllers/passwordController');

const router = express.Router();

router.post('/forgot/otp', requestOTPForgotPassword);

module.exports = router;