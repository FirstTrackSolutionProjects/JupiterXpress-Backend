const express = require('express');
const cors = require('cors');
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
const adminRoutes = require('./routes/adminRoutes');
const warehouseRoutes = require('./routes/warehouseRoutes');
const contactRoutes = require('./routes/contactRoutes');
const s3Routes = require('./routes/s3Routes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const kycRoutes = require('./routes/kycRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const emailVerificationRoutes = require('./routes/emailVerificationRoutes');
const serviceAvailabilityRoutes = require('./routes/serviceAvailabilityRoutes');
const devRoutes = require('./routes/devRoutes');
connectDB();

const app = express();
app.use(express.json());
app.use(cors())
app.use('/test', testRoute);
app.use('/auth', authRoutes);
app.use('/password', passwordRoutes);
app.use('/merchant', merchantRoutes);
app.use('/shipment', shipmentRoutes);
app.use('/order', orderRoutes);
app.use('/wallet', walletRoutes);
app.use('/admin', adminRoutes);
app.use('/warehouse', warehouseRoutes)
app.use('/contact', contactRoutes)
app.use('/s3', s3Routes)
app.use('/dashboard', dashboardRoutes)
app.use('/kyc', kycRoutes)
app.use('/verification', verificationRoutes)
app.use('/email/verification', emailVerificationRoutes)
app.use('/service', serviceAvailabilityRoutes)
app.use('/dev', devRoutes)


module.exports.handler = serverless(app);