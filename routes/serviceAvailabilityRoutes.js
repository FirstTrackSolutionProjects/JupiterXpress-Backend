const express = require('express');
const { isServiceAvailable } = require('../controllers/serviceAvailabilityController');

const router = express.Router();

router.post('/check', isServiceAvailable);

module.exports = router;