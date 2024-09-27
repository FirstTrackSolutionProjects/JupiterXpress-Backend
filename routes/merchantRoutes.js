const express = require('express');
const { activateMerchant, 
        deactivateMerchant,  
        getUnverifiedMerchants,
        getMerchantProfile
    } = require('../controllers/merchantController');

const router = express.Router();

router.post('/activate', activateMerchant);
router.post('/deactivate', deactivateMerchant);
router.post('/unverified', getUnverifiedMerchants);
router.post('/profile', getMerchantProfile);

module.exports = router;