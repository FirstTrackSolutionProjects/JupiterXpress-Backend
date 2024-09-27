const express = require('express');
const { getAllWarehouses, getWarehouses } = require('../controllers/warehouseController');

const router = express.Router();

router.post('/warehouses/all', getAllWarehouses);
router.post('/warehouses', getWarehouses);

module.exports = router;