const express = require('express');
const { getAllWarehouses, getWarehouses, createWarehouse } = require('../controllers/warehouseController');

const router = express.Router();

router.post('/warehouses/all', getAllWarehouses);
router.post('/warehouses', getWarehouses);
router.post('/create', createWarehouse);

module.exports = router;