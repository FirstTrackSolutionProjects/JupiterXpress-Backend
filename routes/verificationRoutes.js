const express = require('express');
const {
    createIncompleteVerifyRequest,
    submitVerifyRequest,
    getVerificationDocumentStatus,
    getPendingVerificationRequests,
    getIncompleteVerification,
    rejectVerificationRequest
} = require('../controllers/verificationController');

const router = express.Router();

router.post('/createIncompleteVerifyRequest', createIncompleteVerifyRequest);
router.post('/submit', submitVerifyRequest);
router.post('/documentStatus', getVerificationDocumentStatus)
router.post('/requests', getPendingVerificationRequests)
router.post('/incomplete', getIncompleteVerification);
router.post('/request/reject', rejectVerificationRequest)

module.exports = router;