const express = require('express');
const { cancelShipment, 
        createDomesticShipment, 
        createInternationalShipment, 
        getAllDomesticShipmentReports, 
        getInternationalShipmentReport,
        getInternationalShipments,
        getDomesticShipmentReport,
        getDomesticShipmentReports
    } = require('../controllers/shipmentController');

const router = express.Router();

router.post('/cancel', cancelShipment);
router.post('/domestic/create', createDomesticShipment);
router.post('/international/create', createInternationalShipment);
router.post('/domestic/reports/all', getAllDomesticShipmentReports);
router.post('/international/report', getInternationalShipmentReport);
router.post('/international/all', getInternationalShipments)
router.post('/domestic/report', getDomesticShipmentReport);
router.post('/domestic/reports', getDomesticShipmentReports)


module.exports = router;