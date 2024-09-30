const express = require('express');
const { devLogin } = require('../controllers/devController');

const router = express.Router();

router.post('/login', devLogin);

module.exports = router;