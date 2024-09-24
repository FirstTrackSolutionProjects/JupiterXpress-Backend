const express = require('express');
const { test, testPost } = require('../controllers/testController');

const router = express.Router();

router.get('/', test);
router.post('/post', testPost);

module.exports = router;