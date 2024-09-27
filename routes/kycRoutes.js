
const express = require('express');
const { 
    submitKYC,
    getKYCDocumentStatus,
    getIncompleteKYC,
    getAllPendingKYCRequests
 } = require('../controllers/kycController');

const router = express.Router();

router.post('/submit', submitKYC);
router.post('/documentStatus', getKYCDocumentStatus)
router.post('/incomplete', getIncompleteKYC);
router.post('/pending/all', getAllPendingKYCRequests)

module.exports = router;

