const express = require('express');
const { getMerchantDiscounts, 
        addMerchantDiscount, 
        updateMerchantDiscount, 
        deleteMerchantDiscount 
    } = require('../controllers/discountController');

const router = express.Router();

router.get('/:uid', getMerchantDiscounts);
router.post('/', addMerchantDiscount);
router.put('/', updateMerchantDiscount);
router.delete('/', deleteMerchantDiscount);

module.exports = router;