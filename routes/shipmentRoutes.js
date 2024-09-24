const express = require('express');
const { cancelShipment } = require('../controllers/shipmentController');

const router = express.Router();

router.post('/cancel', cancelShipment);

module.exports = router;