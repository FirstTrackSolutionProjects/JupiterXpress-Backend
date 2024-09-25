const express = require('express');
const { cancelShipment, createShipment } = require('../controllers/shipmentController');

const router = express.Router();

router.post('/cancel', cancelShipment);
router.post('/create', createShipment);

module.exports = router;