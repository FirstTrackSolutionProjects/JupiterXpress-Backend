const Razorpay = require('razorpay');

const createRazorpayOrderId = async (req, res) => {
    const { amount } = req.body;
    if (!amount) {
        return res.status(400).json({ message: 'Amount is required' });
    }
    if (amount < 1){
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

module.exports = {createRazorpayOrderId};