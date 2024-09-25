const express = require('express');
const { cancelShipment, createDomesticShipment, createInternationalShipment } = require('../controllers/shipmentController');

const router = express.Router();

router.post('/cancel', cancelShipment);
router.post('/domestic/create', createDomesticShipment);
router.post('/international/create', createInternationalShipment);

module.exports = router;