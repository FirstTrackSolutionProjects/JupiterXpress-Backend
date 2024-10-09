const express = require('express');
const { getAllWarehouses, getWarehouses, createWarehouse, updateWarehouse } = require('../controllers/warehouseController');

const router = express.Router();

router.post('/warehouses/all', getAllWarehouses);
router.post('/warehouses', getWarehouses);
router.post('/create', createWarehouse);
router.post('/update', updateWarehouse);

module.exports = router;