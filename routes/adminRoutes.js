const express = require('express');
const { getAdminProfile } = require('../controllers/adminController');

const router = express.Router();

router.post('/profile', getAdminProfile);

module.exports = router;