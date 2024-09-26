const express = require('express');
const { createIncompleteVerifyRequest, 
        activateMerchant, 
        deactivateMerchant, 
        submitKYC, 
        submitVerifyRequest,
        getVerificationDocumentStatus,
        getKYCDocumentStatus,
        getIncompleteKYC,
        getAllPendingKYCRequests,
        getUnverifiedMerchants,
        getMerchantProfile
    } = require('../controllers/merchantController');

const router = express.Router();

router.post('/verification/createIncompleteVerifyRequest', createIncompleteVerifyRequest);
router.post('/verification/submit', submitVerifyRequest);
router.post('/verification/documentStatus', getVerificationDocumentStatus)

router.post('/kyc/submit', submitKYC);
router.post('/kyc/documentStatus', getKYCDocumentStatus)
router.post('/kyc/incomplete', getIncompleteKYC);
router.post('/kyc/pending/all', getAllPendingKYCRequests)

router.post('/activate', activateMerchant);
router.post('/deactivate', deactivateMerchant);
router.post('/unverified', getUnverifiedMerchants);
router.post('/profile', getMerchantProfile);

module.exports = router;