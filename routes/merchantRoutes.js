const express = require('express');
const { createIncompleteVerifyRequest, activateMerchant, deactivateMerchant, submitKYC, submitVerifyRequest } = require('../controllers/merchantController');

const router = express.Router();

router.post('/verification/createIncompleteVerifyRequest', createIncompleteVerifyRequest);
router.post('/verification/submit', submitVerifyRequest);

router.post('/kyc/submit', submitKYC);

router.post('/activate', activateMerchant);
router.post('/deactivate', deactivateMerchant);

module.exports = router;