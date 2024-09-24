const express = require('express');
const serverless = require('serverless-http');
require('dotenv').config()
const {connectDB} = require('./utils/db');
const testRoute = require('./routes/testRoute');
const authRoutes = require('./routes/authRoutes');
connectDB();

const app = express();
app.use(express.json());
app.use('/test', testRoute);
app.use('/auth', authRoutes);
app.use('/password', passwordRoutes);

module.exports.handler = serverless(app);