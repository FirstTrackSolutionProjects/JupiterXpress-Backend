const express = require('express');
const { login, register, getTokenData } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/token/decode', getTokenData)

module.exports = router;