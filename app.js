const express = require('express');
const serverless = require('serverless-http');
require('dotenv').config()
const {connectDB} = require('./utils/db');
const testRoute = require('./routes/testRoute');
const authRoutes = require('./routes/authRoutes');
const passwordRoutes = require('./routes/passwordRoutes');
const merchantRoutes = require('./routes/merchantRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const walletRoutes = require('./routes/walletRoutes');
connectDB();

const app = express();
app.use(express.json());
app.use('/test', testRoute);
app.use('/auth', authRoutes);
app.use('/password', passwordRoutes);
app.use('/merchant', merchantRoutes);
app.use('/shipment', shipmentRoutes);
app.use('/order', orderRoutes);
app.use('/wallet', walletRoutes);

module.exports.handler = serverless(app);