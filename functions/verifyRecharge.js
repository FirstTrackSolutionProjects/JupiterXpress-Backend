const Razorpay = require('razorpay');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, 
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
exports.handler = async (event, context) => {

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, uid, amount } = event.body;

  // Verify the payment signature
  const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

    if (generatedSignature !== razorpay_signature) {
        return {
          status:400, error: 'Invalid payment signature' 
        };
      }

  // Connect to MySQL database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Update user's wallet balance in database
    await connection.beginTransaction();
    await connection.execute('UPDATE WALLET SET balance = balance + ? WHERE uid = ?', [amount, uid]);
    // Insert transaction record
    const transactionDetails = {
      uid,
      razorpay_payment_id,
      razorpay_order_id,
      amount,
      date: new Date(),
    };
    
    await connection.execute(
      'INSERT INTO RECHARGE (uid, payment_id, order_id, amount, date) VALUES (?, ?, ?, ?, ?)',
      [transactionDetails.uid, transactionDetails.razorpay_payment_id, transactionDetails.razorpay_order_id, transactionDetails.amount, transactionDetails.date]
    );
    await connection.commit();
    const [users] = await connection.execute("SELECT * FROM USERS WHERE uid = ?", [uid]);
    const {email , fullName} = users[0];
    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: email, 
      subject: 'Wallet Recharge Successfull', 
      text: `Dear ${fullName}, \nYour wallet recharge for amount ₹${amount} and order Id : ${transactionDetails.razorpay_order_id} has been verified and credited to your wallet.\nRegards,\nJupiter Xpress`
    };
  await transporter.sendMail(mailOptions);
    return {
      status:200, success: true, message : "Recharge Successfull" 
    };
  } catch (error) {
    return {
      status:500, error: error.message
    };
  } finally {
    connection.end();
  }
};
