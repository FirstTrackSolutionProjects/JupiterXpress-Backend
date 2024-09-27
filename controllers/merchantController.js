const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { transporter } = require('../utils/email');

const SECRET_KEY = process.env.JWT_SECRET;

const getMerchantProfile = async (req, res) => {
    const token = req.headers.authorization

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id
        const [rows] = await db.query('SELECT * FROM USERS NATURAL JOIN USER_DATA WHERE uid = ?', [id]);
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
            status: 500, message: 'Error', error: error.message
        });
    } 
}

const activateMerchant = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return {
            status: 401, message: "Access Denied"
        };
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        if (!admin) {
            return res.status(401).json({
                status: 401, message: 'Access Denied'
            });
        }
        const { uid } = req.body;

        if (!uid) {
            return res.status(400).json({
                status: 400, message: 'uid is required'
            });
        }

        try {
            await db.query('UPDATE USERS set isActive=1 where uid = ?', [uid]);
            const [users] = await db.query("SELECT * FROM USERS WHERE uid = ?", [uid]);
            const { email, fullName } = users[0];
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Your account has been activated',
                text: `Dear ${fullName}, \nYour account has been re-activated.\n\nRegards,\nJupiter Xpress`
            };
            await transporter.sendMail(mailOptions);
            return res.status(200).json({
                status: 200, success: true, message: 'Account has been activated successfully'
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, error: error.message
            });
        }
    } catch (e) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const deactivateMerchant = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return {
            status: 401, message: "Access Denied"
        };
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        if (!admin) {
            return res.status(401).json({
                status: 401, message: 'Access Denied'
            });
        }
        const { uid } = req.body;
        if (!uid) {
            return res.status(400).json({
                status: 400, message: 'uid is required'
            });
        }
        try {
            const [users] = await db.query("SELECT * FROM USERS WHERE uid = ?", [uid]);
            const { email, fullName } = users[0];
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Your account has been deactivated',
                text: `Dear ${fullName}, \nYour account has been deactivated, if you think it's a mistake contact us.\nRegards,\nJupiter Xpress`
            };
            await transporter.sendMail(mailOptions);

            return {
                status: 200, success: true, message: 'Account has been deactivated successfully'
            };
        } catch (error) {
            return {
                status: 500, error: error.message
            };
        }
    } catch (e) {
        return {
            status: 400, message: 'Invalid Token'
        };
    }
}

const getUnverifiedMerchants = async (req, res) => {
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
            return res.status(400).json({
                status: 400, message: 'Not an admin'
            });
        }
        try {
            const [users] = await db.query("SELECT * FROM USERS WHERE isVerified=0 AND isAdmin=0");
            return res.status(200).json({
                status: 200, success: true, message: users
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, message: error.message, error: error.message
            });
        }
    } catch (err) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        })
    }
}

module.exports = {
    getMerchantProfile,
    activateMerchant,
    deactivateMerchant,
    getUnverifiedMerchants
}