const express = require('express');
const { cancelShipment, createDomesticShipment, createInternationalShipment, getAllDomesticShipmentReports } = require('../controllers/shipmentController');

const router = express.Router();

router.post('/cancel', cancelShipment);
router.post('/domestic/create', createDomesticShipment);
router.post('/international/create', createInternationalShipment);
router.post('/domestic/reports', getAllDomesticShipmentReports);

module.exports = router;