const express = require('express');
const { createIncompleteVerifyRequest, activateMerchant } = require('../controllers/merchantController');

const router = express.Router();

router.post('/verification/createIncompleteVerifyRequest', createIncompleteVerifyRequest);



router.post('/activate', activateMerchant);

module.exports = router;