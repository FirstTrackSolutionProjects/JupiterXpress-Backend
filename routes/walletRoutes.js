const express = require('express');
const { createRazorpayOrderId, 
        getAllRechargeTransactions, 
        getBalance,
        getAllExpenseTransactions ,
        getAllManualRechargeTransactions,
        getAllRefundTransactions,
        manualRecharge,
        verifyRazorpayRecharge
    } = require('../controllers/walletController');

const router = express.Router();

router.post('/razorpay/createOrderId', createRazorpayOrderId);
router.post('/recharges', getAllRechargeTransactions);
router.post('/expenses', getAllExpenseTransactions);
router.post('/manualRecharges', getAllManualRechargeTransactions);
router.post('/refunds', getAllRefundTransactions)
router.post('/balance', getBalance)
router.post('/manualRecharge', manualRecharge)
router.post('/verify/recharge', verifyRazorpayRecharge)


module.exports = router;