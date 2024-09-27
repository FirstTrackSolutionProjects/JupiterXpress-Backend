
const express = require('express');
const { 
    submitKYC,
    getKYCDocumentStatus,
    getIncompleteKYC,
    getAllPendingKYCRequests,
    submitIncompleteKYC,
    rejectKYCRequest,
    updateKYCDocumentStatus
 } = require('../controllers/kycController');

const router = express.Router();

router.post('/submit', submitKYC);
router.post('/documentStatus', getKYCDocumentStatus)
router.post('/documentStatus/update', updateKYCDocumentStatus)
router.post('/incomplete', getIncompleteKYC);
router.post('/pending/all', getAllPendingKYCRequests)
router.post('/submit/incomplete', submitIncompleteKYC);
router.post('/request/reject', rejectKYCRequest);

module.exports = router;

