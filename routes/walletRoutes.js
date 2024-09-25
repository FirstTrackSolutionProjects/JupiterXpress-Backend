const express = require('express');
const { createRazorpayOrderId } = require('../controllers/walletController');

const router = express.Router();

router.post('razorpay/createOrderId', createRazorpayOrderId);

module.exports = router;