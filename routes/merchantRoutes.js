const express = require('express');
const { createIncompleteVerifyRequest } = require('../controllers/merchantController');

const router = express.Router();

router.post('/verification/createIncompleteVerifyRequest', createIncompleteVerifyRequest);

module.exports = router;