const express = require('express');
const { createDomesticOrder, createInternationalOrder, getAllDomesticOrders } = require('../controllers/orderController');

const router = express.Router();

router.post('/domestic/create', createDomesticOrder);
router.post('/international/create', createInternationalOrder);
router.post('/domestic/all', getAllDomesticOrders)

module.exports = router;