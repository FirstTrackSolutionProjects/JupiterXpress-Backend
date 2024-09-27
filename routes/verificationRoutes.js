const express = require('express');
const {
    createIncompleteVerifyRequest,
    submitVerifyRequest,
    getVerificationDocumentStatus,
    getPendingVerificationRequests
} = require('../controllers/verificationController');

const router = express.Router();

router.post('/verification/createIncompleteVerifyRequest', createIncompleteVerifyRequest);
router.post('/verification/submit', submitVerifyRequest);
router.post('/verification/documentStatus', getVerificationDocumentStatus)
router.post('/verification/requests', getPendingVerificationRequests)

module.exports = router;