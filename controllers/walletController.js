const Razorpay = require('razorpay');

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

module.exports = { createRazorpayOrderId, getAllRechargeTransactions };