const express = require('express');
const { createDomesticOrder, 
        createInternationalOrder, 
        getAllDomesticOrders, 
        getDomesticOrderBoxes,
        getInternationalOrderDocketItems,
        getInternationalOrderDockets
    } = require('../controllers/orderController');

const router = express.Router();

router.post('/domestic/create', createDomesticOrder);
router.post('/international/create', createInternationalOrder);
router.post('/domestic/all', getAllDomesticOrders)
router.post('/domestic/boxes', getDomesticOrderBoxes )
router.post('/international/items', getInternationalOrderDocketItems )
router.post('/international/dockets', getInternationalOrderDockets )

module.exports = router;