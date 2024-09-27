const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const SECRET_KEY = process.env.JWT_SECRET;

const getAllWarehouses = async (req, res) => {
    const token = req.headers.authorization;
    const verified = jwt.verify(token, SECRET_KEY);
    const admin = verified.admin;
    if (!admin) {
        return res.status(400).json({
            status: 400, message: 'Access Denied'
        });
    }
    try {

        const [rows] = await db.query('SELECT * FROM WAREHOUSES');
        return res.status(200).json({
            status: 200, rows
        });

    } catch (error) {
        return res.status(400).json({
            status: 400, message: error.message, success: false
        });
    }
}

const getWarehouses = async (req, res) => {
    const token = req.headers.authorization;
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id;
    if (!id) {
        return res.status(400).json({
            status: 400, message: 'Access Denied'
        });
    }
    try {
        const [rows] = await db.query('SELECT * FROM WAREHOUSES WHERE uid = ?', [id]);
        return res.status(200).json({
            status: 200, rows
        });

    } catch (error) {
        return res.status(500).json({
            status: 500, message: error.message, success: false
        });
    }
}

module.exports = { getAllWarehouses, getWarehouses };