const express = require('express');
const { createDomesticOrder, 
        createInternationalOrder, 
        getAllDomesticOrders, 
        getDomesticOrderBoxes,
        getInternationalOrderDocketItems,
        getInternationalOrderDockets,
        getInternationalOrders,
        getDomesticOrder,
        updateDomesticOrder,
        updateInternationalOrder,
        deleteDomesticOrder,
        getDomesticOrders,
        getAllDomesticOrdersOld
    } = require('../controllers/orderController');

const router = express.Router();

router.post('/domestic/create', createDomesticOrder);
router.post('/domestic/update', updateDomesticOrder);
router.post('/international/create', createInternationalOrder);
router.post('/international/update', updateInternationalOrder);
router.get('/domestic/all', getAllDomesticOrders)
router.post('/domestic/merchant', getAllDomesticOrdersOld)
router.post('/domestic/boxes', getDomesticOrderBoxes )
router.post('/international/items', getInternationalOrderDocketItems )
router.post('/international/dockets', getInternationalOrderDockets )
router.post('/international/all', getInternationalOrders)
router.post('/domestic', getDomesticOrder)
router.post('/domestic/delete', deleteDomesticOrder)

module.exports = router;