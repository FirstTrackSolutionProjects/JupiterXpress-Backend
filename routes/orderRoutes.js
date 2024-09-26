const express = require('express');
const { createDomesticOrder, createInternationalOrder, getAllDomesticOrders, getOrderBoxes } = require('../controllers/orderController');

const router = express.Router();

router.post('/domestic/create', createDomesticOrder);
router.post('/international/create', createInternationalOrder);
router.post('/domestic/all', getAllDomesticOrders)
router.post('/boxes', getOrderBoxes )

module.exports = router;