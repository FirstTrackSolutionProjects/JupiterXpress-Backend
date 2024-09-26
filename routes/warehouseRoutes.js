const express = require('express');
const { getAllWarehouses } = require('../controllers/warehouseController');

const router = express.Router();

router.post('/warehouses/all', getAllWarehouses);

module.exports = router;