const express = require('express');
const { getContactRequests } = require('../controllers/contactController');

const router = express.Router();

router.post('/all', getContactRequests);

module.exports = router;