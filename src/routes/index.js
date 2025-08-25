const express = require('express');
const config = require('../config');

const router = express.Router();

// Mount route modules
router.use('/products', require('./products'));
router.use('/categories', require('./categories'));
router.use('/availability', require('./availability'));
router.use('/ai', require('./ai'));

module.exports = router;