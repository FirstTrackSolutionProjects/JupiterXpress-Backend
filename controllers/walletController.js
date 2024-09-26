const Razorpay = require('razorpay');
const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const SECRET_KEY = process.env.JWT_SECRET;

const createRazorpayOrderId = async (req, res) => {
    const { amount } = req.body;
    if (!amount) {
        return res.status(400).json({ message: 'Amount is required' });
    }
    if (amount < 1) {
        return res.status(400).json({ message: 'Amount should be greater than or equal to 1' });
    }
    const razorpay = new Razorpay({
        key_id: "rzp_live_bUjlhO5HTl10ug",
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
        amount: amount * 100, // Amount in paise
        currency: 'INR',
    };

    try {
        const order = await razorpay.orders.create(options);
        return order;
    } catch (error) {
        return {
            status: 500, error: error.message
        };
    }
}

const getAllRechargeTransactions = async (req, res) => {
    const token = req.headers.authorization;

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        if (!admin) {
            return res.status(400).json({
                status: 400, success: false, message: "Access Denied"
            })
        }
        const [rows] = await db.query('SELECT * FROM RECHARGE r JOIN USERS u ON r.uid=u.uid');


        return res.status(200).json({
            status: 200, success: true, data: rows
        });
    } catch (error) {
        return res.status(500).json({
            status: 500, message: 'Unexpected Error while fetching transactions', error: error.message
        });
    }
}

const getBalance = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return {
            status: 401, message: "Access Denied"
        };
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        if (!id) {
            return res.status(400).json({
                status: 400, message: 'Invalid User'
            });
        }

        try {
            const [rows] = await db.query('SELECT * FROM WALLET WHERE uid = ?', [id]);

            if (rows.length === 0) {
                return {
                    status: 404, error: 'User not found'
                };
            }

            const balance = rows[0].balance;

            return res.status(200).json({
                status: 200, balance
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

const getAllExpenseTransactions = async (req, res) => {
    const token = req.headers.authorization;

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const admin = verified.admin;
        if (admin) {
            const [rows] = await db.query('SELECT * FROM EXPENSES e JOIN USERS u ON e.uid = u.uid');


            return res.status(200).json({
                status: 200, success: true, data: rows
            });
        }
        const [rows] = await db.query('SELECT * FROM EXPENSES where uid = ?', [id]);

        return res.status(200).json({
            status: 200, success: true, data: rows
        });

    } catch (error) {
        return res.status(500).json({
            status: 500, message: 'Unexpected Error while fetching transactions', error: error.message
        });
    }
}

const getAllManualRechargeTransactions = async (req, res) => {
    const token = req.headers.authorization;

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const admin = verified.admin;
        if (admin) {
            const [rows] = await db.query('SELECT * FROM MANUAL_RECHARGE r JOIN USERS u ON r.beneficiary_id = u.uid');

            return res.status(200).json({
                status: 200, success: true, data: rows
            });
        }
        const [rows] = await db.query('SELECT * FROM MANUAL_RECHARGE where beneficiary_id = ?', [id]);


        return res.status(200).json({
            status: 200, success: true, data: rows
        });

    } catch (error) {
        return res.status(500).json({
            status: 500, message: 'Unexpected Error while fetching transactions', error: error.message
        });
    }
}

const getAllRefundTransactions = async (req, res) => {
    const token = req.headers.authorization;

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const admin = verified.admin;
        if (admin) {
            const [rows] = await db.query('SELECT * FROM REFUND r JOIN USERS u ON r.uid = u.uid');
            return res.status(200).json({
                status: 200, success: true, data: rows
            });
        }
        const [rows] = await db.query('SELECT * FROM REFUND where uid = ?', [id]);


        return res.status(200).json({
            status: 200, success: true, data: rows
        });

    } catch (error) {
        return res.status(500).json({
            status: 500, message: 'Unexpected Error while fetching transactions', error: error.message
        });
    }
}

module.exports = {
    createRazorpayOrderId,
    getAllRechargeTransactions,
    getBalance,
    getAllExpenseTransactions,
    getAllManualRechargeTransactions,
    getAllRefundTransactions
};