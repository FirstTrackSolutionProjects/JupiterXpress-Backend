const express = require('express');
const { getContactRequests, submitContactRequest } = require('../controllers/contactController');

const router = express.Router();

router.post('/all', getContactRequests);
router.post('/submit', submitContactRequest);

module.exports = router;