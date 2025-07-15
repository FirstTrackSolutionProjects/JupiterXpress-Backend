const express = require('express');
const { getPendingRefunds, creditRefund } = require('../controllers/pendingRefundController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getPendingRefunds);
router.patch('/:ord_id/refund', authMiddleware, creditRefund);

module.exports = router;