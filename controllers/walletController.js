const Razorpay = require('razorpay');
const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const crypto = require('crypto');
const { transporter } = require('../utils/email');

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
        return res.status(200).json(order);
    } catch (error) {
        return res.status(500).json({
            status: 500, error: error.message
        });
    }
}

const getAllRechargeTransactions = async (req, res) => {
    const token = req.headers.authorization;

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const admin = verified.admin;
        if (!admin) {
            const [rows] = await db.query('SELECT * FROM RECHARGE WHERE uid = ?', [id]);
            return res.status(200).json({
                status: 200, success: true, data: rows
            });
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

const getAllDisputeChargesTransactions = async (req, res) => {
    const token = req.headers.authorization;

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const admin = verified.admin;
        if (!admin) {
            const [rows] = await db.query('SELECT dc.*, sv.service_name AS service_name FROM DISPUTE_CHARGES dc JOIN SHIPMENTS s ON dc.dispute_order = s.ord_id JOIN SERVICES sv ON s.serviceId = sv.service_id WHERE dc.uid = ?', [id]);
            return res.status(200).json({
                status: 200, success: true, data: rows
            });
        }
        const [rows] = await db.query('SELECT dc.*, sv.service_name AS service_name FROM DISPUTE_CHARGES dc JOIN USERS u ON dc.uid=u.uid JOIN SHIPMENTS s ON dc.dispute_order = s.ord_id JOIN SERVICES sv ON s.serviceId = sv.service_id');
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
            const [rows] = await db.query('SELECT e.*, u.*, sv.service_name AS service_name FROM EXPENSES e JOIN USERS u ON e.uid = u.uid JOIN SHIPMENTS s ON e.expense_order = s.ord_id JOIN SERVICES sv ON s.serviceId = sv.service_id');

            return res.status(200).json({
                status: 200, success: true, data: rows
            });
        }
        const [rows] = await db.query('SELECT e.*, sv.service_name AS service_name FROM EXPENSES e JOIN SHIPMENTS s ON e.expense_order = s.ord_id JOIN SERVICES sv ON s.serviceId = sv.service_id where e.uid = ?', [id]);

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
            const [rows] = await db.query('SELECT r.*, sv.service_name AS service_name FROM REFUND r JOIN USERS u ON r.uid = u.uid JOIN SHIPMENTS s ON r.refund_order = s.ord_id JOIN SERVICES sv ON s.serviceId = sv.service_id');
            return res.status(200).json({
                status: 200, success: true, data: rows
            });
        }
        const [rows] = await db.query('SELECT r.*, sv.service_name AS service_name FROM REFUND r JOIN SHIPMENTS s ON r.refund_order = s.ord_id JOIN SERVICES sv ON s.serviceId = sv.service_id where r.uid = ?', [id]);


        return res.status(200).json({
            status: 200, success: true, data: rows
        });

    } catch (error) {
        return res.status(500).json({
            status: 500, message: 'Unexpected Error while fetching transactions', error: error.message
        });
    }
}

const manualRecharge = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }
    const { email, amount, reason } = req.body;
    if (!email || !amount || !reason) {
        return res.status(400).json({
            status: 400, message: 'All fields are required'
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
            const transaction = await db.beginTransaction();
            const [users] = await transaction.query('SELECT * FROM USERS WHERE email = ?', [email]);
            if (users.length) {
                const uid = users[0].uid;
                await transaction.query('UPDATE WALLET SET balance = balance + ? WHERE uid = ?', [amount, uid]);
                await transaction.query('INSERT INTO MANUAL_RECHARGE (beneficiary_id, amount, reason) VALUES (?,?,?)', [uid, amount, reason]);
            }
            else {
                await db.rollback(transaction)
                return {
                    status: 400, message: 'User not found'
                };
            }
            await db.commit(transaction);
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Manual Recharge Received',
                text: `Dear Merchant, \nYour wallet got manually ${amount >= 0 ? "credited" : "debited"} by ₹${amount}.\nRegards,\nJupiter Xpress`
            };
            await transporter.sendMail(mailOptions);
            return res.status(200).json({
                status: 200, success: true, message: "Recharge successfull"
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, message: error.message, error: error.message
            });
        }
    } catch (err) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const verifyRazorpayRecharge = async (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, uid, amount } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !uid || !amount) {
        return res.status(400).json({
            status: 400, error: 'Missing required parameters'
        });
    }
    try {
        // Verify the payment signature
        const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({
                status: 400, error: 'Invalid payment signature'
            });
        }

        try {
            // Update user's wallet balance in database
            const transaction = await db.beginTransaction();
            await transaction.query('UPDATE WALLET SET balance = balance + ? WHERE uid = ?', [amount, uid]);
            // Insert transaction record
            const transactionDetails = {
                uid,
                razorpay_payment_id,
                razorpay_order_id,
                amount,
                date: new Date(),
            };

            await transaction.query(
                'INSERT INTO RECHARGE (uid, payment_id, order_id, amount, date) VALUES (?, ?, ?, ?, ?)',
                [transactionDetails.uid, transactionDetails.razorpay_payment_id, transactionDetails.razorpay_order_id, transactionDetails.amount, transactionDetails.date]
            );
            await db.commit(transaction);
            const [users] = await db.query("SELECT * FROM USERS WHERE uid = ?", [uid]);
            const { email, fullName } = users[0];
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Wallet Recharge Successfull',
                text: `Dear ${fullName}, \nYour wallet recharge for amount ₹${amount} and order Id : ${transactionDetails.razorpay_order_id} has been verified and credited to your wallet.\nRegards,\nJupiter Xpress`
            };
            await transporter.sendMail(mailOptions);
            return res.status(200).json({
                status: 200, success: true, message: "Recharge Successfull"
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, error: error.message
            });
        }
    } catch (error) {
        return res.status(500).json({
            status: 500, error: 'Something went wrong'
        });
    }
}

module.exports = {
    createRazorpayOrderId,
    getAllRechargeTransactions,
    getBalance,
    getAllExpenseTransactions,
    getAllManualRechargeTransactions,
    getAllRefundTransactions,
    manualRecharge,
    verifyRazorpayRecharge,
    getAllDisputeChargesTransactions
};