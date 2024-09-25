const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const SECRET_KEY = process.env.JWT_SECRET

const getAdminProfile = async (req, res) => {
    const token = req.headers.authorization
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id
        const [rows] = await db.query('SELECT * FROM USERS NATURAL JOIN EMPLOYEE_INFO WHERE uid = ?', [id]);
        if (rows.length > 0) {
            return res.status(200).json({
                status: 200, success: true, data: rows[0]
            });
        } else {
            return res.status(401).json({
                status: 401, message: 'Invalid credentials'
            });
        }
    } catch (error) {
        return res.status(500).json({
            status: 500, message: 'Error logging in', error: error.message
        });
    }
}

module.exports = { getAdminProfile };