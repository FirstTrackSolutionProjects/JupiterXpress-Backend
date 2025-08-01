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
        domesticShipmentPickupSchedule,
        trackShipment,
        updateDomesticProcessingShipments,
        getAllDomesticShipmentReportsData,
        getDomesticShipmentReportsData,
        getAllDomesticShipmentReportsAdmin,
        getAllDomesticShipmentReportsMerchant,
        getAllDomesticShipmentReportsDataMerchant
    } = require('../controllers/shipmentController');

const router = express.Router();

router.post('/cancel', cancelShipment);
router.post('/track', trackShipment);

router.post('/domestic/create', createDomesticShipment);
router.post('/domestic/reports/all', getAllDomesticShipmentReports);
router.get('/domestic/reports/admin', getAllDomesticShipmentReportsAdmin)
router.get('/domestic/reports', getAllDomesticShipmentReportsMerchant)
router.post('/domestic/report', getDomesticShipmentReport);
router.post('/domestic/label', getDomesticShipmentLabel)
router.post('/domestic/price', getDomesticShipmentPricing)
router.post('/domestic/pickup/request', domesticShipmentPickupSchedule)
router.post('/domestic/refresh', updateDomesticProcessingShipments)
router.post('/domestic/reports/download/admin', getAllDomesticShipmentReportsData)
router.post('/domestic/reports/download/merchant', getAllDomesticShipmentReportsDataMerchant)

router.post('/international/create', createInternationalShipment);
router.post('/international/report', getInternationalShipmentReport);
router.post('/international/all', getInternationalShipments)
router.post('/international/price/inquiry', internationalShipmentPricingInquiry)


module.exports = router;