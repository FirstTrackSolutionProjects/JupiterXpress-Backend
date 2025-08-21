const express = require('express');
const { 
    getServices, 
    getActiveShipmentServices, 
    getDomesticActiveShipmentServices, 
    getInternationalActiveShipmentServices, 
    getInternationalShipmentServiceVendors 
} = require('../controllers/serviceController');

const router = express.Router();

router.get('/', getServices);
router.get('/active-shipments', getActiveShipmentServices);
router.get('/active-shipments/domestic', getDomesticActiveShipmentServices);
router.get('/active-shipments/international', getInternationalActiveShipmentServices);
router.get('/active-shipments/international/:service_id/vendors', getInternationalShipmentServiceVendors);

module.exports = router;