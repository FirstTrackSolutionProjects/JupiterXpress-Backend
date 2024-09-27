const express = require('express');
const { cancelShipment, 
        createDomesticShipment, 
        createInternationalShipment, 
        getAllDomesticShipmentReports, 
        getInternationalShipmentReport,
        getInternationalShipments,
        getDomesticShipmentReport,
        getDomesticShipmentReports,
        getDomesticShipmentLabel,
        getDomesticShipmentPricing,
        internationalShipmentPricingInquiry,
        domesticShipmentPickupSchedule
    } = require('../controllers/shipmentController');

const router = express.Router();

router.post('/cancel', cancelShipment);


router.post('/domestic/create', createDomesticShipment);
router.post('/domestic/reports/all', getAllDomesticShipmentReports);
router.post('/domestic/reports', getDomesticShipmentReports)
router.post('/domestic/report', getDomesticShipmentReport);
router.post('/domestic/label', getDomesticShipmentLabel)
router.post('/domestic/price', getDomesticShipmentPricing)
router.post('/domestic/pickup/request', domesticShipmentPickupSchedule)

router.post('/international/create', createInternationalShipment);
router.post('/international/report', getInternationalShipmentReport);
router.post('/international/all', getInternationalShipments)
router.post('/international/price/inquiry', internationalShipmentPricingInquiry)


module.exports = router;