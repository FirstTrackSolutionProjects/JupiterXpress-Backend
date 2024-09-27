const express = require('express');
const {
    createIncompleteVerifyRequest,
    submitVerifyRequest,
    getVerificationDocumentStatus,
    getPendingVerificationRequests
} = require('../controllers/verificationController');

const router = express.Router();

router.post('/createIncompleteVerifyRequest', createIncompleteVerifyRequest);
router.post('/submit', submitVerifyRequest);
router.post('/documentStatus', getVerificationDocumentStatus)
router.post('/requests', getPendingVerificationRequests)

module.exports = router;