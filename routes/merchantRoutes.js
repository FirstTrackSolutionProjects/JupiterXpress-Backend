const express = require('express');
const { createIncompleteVerifyRequest, 
        activateMerchant, 
        deactivateMerchant,  
        submitVerifyRequest,
        getVerificationDocumentStatus,
        getUnverifiedMerchants,
        getMerchantProfile
    } = require('../controllers/merchantController');

const router = express.Router();

router.post('/verification/createIncompleteVerifyRequest', createIncompleteVerifyRequest);
router.post('/verification/submit', submitVerifyRequest);
router.post('/verification/documentStatus', getVerificationDocumentStatus)



router.post('/activate', activateMerchant);
router.post('/deactivate', deactivateMerchant);
router.post('/unverified', getUnverifiedMerchants);
router.post('/profile', getMerchantProfile);

module.exports = router;