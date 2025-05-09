const express = require('express');
const { getServices, getActiveShipmentServices, getDomesticActiveShipmentServices } = require('../controllers/serviceController');

const router = express.Router();

router.get('/', getServices);
router.get('/active-shipments', getActiveShipmentServices);
router.get('/active-shipments/domestic', getDomesticActiveShipmentServices);

module.exports = router;