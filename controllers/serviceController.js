const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const SECRET_KEY = process.env.JWT_SECRET;

const getServices = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        if (!admin) {
            return res.status(401).json({
                status: 401, message: 'Unauthorized!'
            });
        }
        const [services] = await db.query("SELECT service_id, service_name FROM SERVICES");
        return res.status(200).json({
            status: 200, success: true, services: services
        });
    } catch (err) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const getActiveShipmentServices = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        if (!admin) {
            return res.status(401).json({
                status: 401, message: 'Unauthorized!'
            });
        }
        const [services] = await db.query("SELECT service_id, service_name FROM SERVICES WHERE is_active = true AND (is_b2c = true OR is_b2b = true)");
        return res.status(200).json({
            status: 200, success: true, services: services
        });
    } catch (err) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const getDomesticActiveShipmentServices = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const [services] = await db.query("SELECT service_id, service_name FROM SERVICES WHERE is_active = true AND (is_b2c = true OR is_b2b = true) AND is_international = false");
        return res.status(200).json({
            status: 200, success: true, services: services
        });
    } catch (err) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

module.exports = {
    getServices,
    getActiveShipmentServices,
    getDomesticActiveShipmentServices
}