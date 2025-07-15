const express = require('express');
const { getPendingCancellations, approveCancellation, rejectCancellation } = require('../controllers/pendingCancellationController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getPendingCancellations);
router.patch('/:ord_id/approve', authMiddleware, approveCancellation);
router.patch('/:ord_id/reject', authMiddleware, rejectCancellation);

module.exports = router;