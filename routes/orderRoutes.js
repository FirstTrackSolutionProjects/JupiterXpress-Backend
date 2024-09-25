const express = require('express');
const { createDomesticOrder, createInternationalOrder } = require('../controllers/orderController');

const router = express.Router();

router.post('/domestic/create', createDomesticOrder);
router.post('/international/create', createInternationalOrder);

module.exports = router;