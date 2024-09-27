const express = require('express');
const { getAllWarehouses, getWarehouses, createWarehouse } = require('../controllers/warehouseController');

const router = express.Router();

router.post('/warehouses/all', getAllWarehouses);
router.post('/warehouses', getWarehouses);
router.post('/createWarehouse', createWarehouse);

module.exports = router;