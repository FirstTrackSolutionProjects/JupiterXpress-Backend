const express = require('express');
const { createRazorpayOrderId, 
        getAllRechargeTransactions, 
        getBalance,
        getAllExpenseTransactions 
    } = require('../controllers/walletController');

const router = express.Router();

router.post('/razorpay/createOrderId', createRazorpayOrderId);
router.post('/recharges/all', getAllRechargeTransactions);
router.post('/expenses', getAllExpenseTransactions);
router.post('/balance', getBalance)

module.exports = router;