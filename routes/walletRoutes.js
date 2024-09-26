const express = require('express');
const { createRazorpayOrderId, 
        getAllRechargeTransactions, 
        getBalance,
        getAllExpenseTransactions ,
        getAllManualRechargeTransactions
    } = require('../controllers/walletController');

const router = express.Router();

router.post('/razorpay/createOrderId', createRazorpayOrderId);
router.post('/recharges/all', getAllRechargeTransactions);
router.post('/expenses', getAllExpenseTransactions);
router.post('/manualRecharges', getAllManualRechargeTransactions);
router.post('/balance', getBalance)

module.exports = router;