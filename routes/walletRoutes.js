const express = require('express');
const { createRazorpayOrderId, 
        // getAllRechargeTransactions, 
        getBalance,
        // getAllExpenseTransactions ,
        // getAllManualRechargeTransactions,
        // getAllRefundTransactions,
        manualRecharge,
        verifyRazorpayRecharge,
        // getAllDisputeChargesTransactions,
        exportAllTransactionsJSON,
        exportTransactionsJSON,
        // getTransactions,
        getAllWalletTransactionsAdmin,
        getAllWalletTransactionsUser
    } = require('../controllers/walletController');
const {authMiddleware} = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/razorpay/createOrderId', createRazorpayOrderId);
// router.post('/recharges', getAllRechargeTransactions);
// router.post('/expenses', getAllExpenseTransactions);
// router.post('/manualRecharges', getAllManualRechargeTransactions);
// router.post('/refunds', getAllRefundTransactions)
router.post('/balance', getBalance)
router.post('/manualRecharge', manualRecharge)
router.post('/verify/recharge', verifyRazorpayRecharge)
// router.get('/dispute-charges', getAllDisputeChargesTransactions)
router.post('/report/download/all', exportAllTransactionsJSON)
router.post('/report/download', exportTransactionsJSON)
router.get('/transactions/admin', authMiddleware ,getAllWalletTransactionsAdmin);
router.get('/transactions/merchant', authMiddleware ,getAllWalletTransactionsUser);



module.exports = router;