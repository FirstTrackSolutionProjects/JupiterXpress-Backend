const express = require('express');
const { cancelShipment, createDomesticShipment } = require('../controllers/shipmentController');

const router = express.Router();

router.post('/cancel', cancelShipment);
router.post('/domestic/create', createDomesticShipment);


module.exports = router;