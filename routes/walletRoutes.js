const express = require('express');
const { createRazorpayOrderId, getAllRechargeTransactions } = require('../controllers/walletController');

const router = express.Router();

router.post('/razorpay/createOrderId', createRazorpayOrderId);
router.post('/recharges/all', getAllRechargeTransactions);


module.exports = router;