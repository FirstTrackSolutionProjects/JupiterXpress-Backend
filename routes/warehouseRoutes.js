const express = require('express');
const { getAllWarehouses, 
        getWarehouses, 
        createWarehouse, 
        updateWarehouse, 
        reAttemptWarehouseCreation, 
        getWarehousesServicesStatus, 
        justCreatedWarehouseChecked
    } = require('../controllers/warehouseController');

const router = express.Router();

router.post('/warehouses/all', getAllWarehouses);
router.post('/warehouses', getWarehouses);
router.post('/create', createWarehouse);
router.post('/update', updateWarehouse);
router.post('/create/retry', reAttemptWarehouseCreation);
router.post('/check', getWarehousesServicesStatus);
router.post('/new/seen', justCreatedWarehouseChecked);

module.exports = router;