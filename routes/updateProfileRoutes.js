const express = require('express');
const { merchantUpdateProfileRequest, approveMerchantUpdateProfileRequest, rejectMerchantUpdateProfileRequest, getPendingMerchantUpdateProfileRequest, getPendingMerchantUpdateProfileRequests } = require('../controllers/updateProfileController');

const router = express.Router();

router.post('/', merchantUpdateProfileRequest);
router.post('/approve', approveMerchantUpdateProfileRequest);
router.post('/reject', rejectMerchantUpdateProfileRequest);
router.get('/', getPendingMerchantUpdateProfileRequest);
router.get('/all', getPendingMerchantUpdateProfileRequests);

module.exports = router;