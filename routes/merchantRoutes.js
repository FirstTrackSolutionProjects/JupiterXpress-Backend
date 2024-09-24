const express = require('express');
const { createIncompleteVerifyRequest, activateMerchant, submitKYC } = require('../controllers/merchantController');

const router = express.Router();

router.post('/verification/createIncompleteVerifyRequest', createIncompleteVerifyRequest);


router.post('/kyc/submit', submitKYC);


router.post('/activate', activateMerchant);

module.exports = router;