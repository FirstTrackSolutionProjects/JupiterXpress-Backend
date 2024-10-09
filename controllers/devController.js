const db = require('../utils/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET_KEY = process.env.JWT_SECRET;

const devLogin = async (req, res) => {

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email required' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM USERS WHERE email = ? AND isActive=1', [email]);
        if (rows.length > 0) {
            const id = rows[0].uid;
            const name = rows[0].fullName;
            const verified = rows[0].isVerified;
            const admin = rows[0].isAdmin;
            const business_name = rows[0].businessName;
            const token = jwt.sign({ email, verified, name, id, business_name, admin }, SECRET_KEY, { expiresIn: '12h' });
            return res.status(200).json({
                status: 200, token: token, success: true, verified: verified
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


module.exports = { devLogin }