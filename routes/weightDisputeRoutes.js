const express = require('express');
const { createDispute, getAllDisputes, getWeightDisputeInfo } = require('../controllers/weightDisputeController');

const router = express.Router();

router.post('/create', createDispute);
router.get('/', getAllDisputes);
router.get('/:dispute_id', getWeightDisputeInfo);

module.exports = router;