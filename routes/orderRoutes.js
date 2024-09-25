const express = require('express');
const { createDomesticOrder } = require('../controllers/orderController');

const router = express.Router();

router.post('/domestic/create', createDomesticOrder);

module.exports = router;