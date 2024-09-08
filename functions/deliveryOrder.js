const Razorpay = require('razorpay');

exports.handler = async (event, context) => {
  const { amount } = event.body;

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
      status:500, error: error.message 
    };
  }
};
