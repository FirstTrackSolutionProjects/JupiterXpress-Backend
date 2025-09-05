const express = require('express');
const { cancelShipment, 
        createDomesticShipment, 
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
        getAllDomesticShipmentReportsDataMerchant,
        approveInternationalShipment,
        rejectInternationalShipment,
        requestInternationalShipment,
        cancelInternationalShipmentRequest,
        cancelInternationalShipment
    } = require('../controllers/shipmentController');
const { authMiddleware } = require('../middlewares/authMiddleware');

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

router.patch('/international/request/approve/:orderId', authMiddleware, approveInternationalShipment);
router.patch('/international/request/reject/:orderId', authMiddleware, rejectInternationalShipment);
router.patch('/international/request/create/:orderId', authMiddleware, requestInternationalShipment);
router.patch('/international/request/cancel/:orderId', authMiddleware, cancelInternationalShipmentRequest);
router.post('/international/report', getInternationalShipmentReport);
router.post('/international/all', getInternationalShipments)
router.post('/international/price/inquiry', internationalShipmentPricingInquiry)
router.patch('/international/cancel/:ord_id', cancelInternationalShipment)


module.exports = router;