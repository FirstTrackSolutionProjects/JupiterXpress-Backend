
const express = require('express');
const { 
    submitKYC,
    getKYCDocumentStatus,
    getIncompleteKYC,
    getAllPendingKYCRequests
 } = require('../controllers/kycController');

const router = express.Router();

router.post('/kyc/submit', submitKYC);
router.post('/kyc/documentStatus', getKYCDocumentStatus)
router.post('/kyc/incomplete', getIncompleteKYC);
router.post('/kyc/pending/all', getAllPendingKYCRequests)

module.exports = router;

