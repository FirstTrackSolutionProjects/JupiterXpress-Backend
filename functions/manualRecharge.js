const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
require('dotenv').config();


const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

let transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, 
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Secret key for JWT
const SECRET_KEY = process.env.JWT_SECRET;

exports.handler = async (event) => {
  const token = event.headers.Authorization;
  if (!token) {
    return {
      status:401, message: 'Access Denied' 
    };
  }
  const {email, amount, reason} = event.body;
  try {
    const verified = jwt.verify(token, SECRET_KEY);
    const admin = verified.admin;
    if (!admin){
      return {
        status:400, message: 'Not an admin'
      };
    }
    try{
          
          const connection = await mysql.createConnection(dbConfig);
          try {
            await connection.beginTransaction();
            const [users] = await connection.execute('SELECT * FROM USERS WHERE email = ?',[email]);
            if (users.length){
              const uid = users[0].uid;
              await connection.execute('UPDATE WALLET SET balance = balance + ? WHERE uid = ?', [amount, uid]);
              await connection.execute('INSERT INTO MANUAL_RECHARGE (beneficiary_id, amount, reason) VALUES (?,?,?)',[uid, amount, reason]);
            }
            else{
              return {
                status:400, message: 'User not found' 
              };
            }
            await connection.commit();
            let mailOptions = {
              from: process.env.EMAIL_USER,
              to: email, 
              subject: 'Manual Recharge Received', 
              text: `Dear Merchant, \nYour wallet got manually ${amount>=0?"credited":"debited"} by ₹${amount}.\nRegards,\nJupiter Xpress`
            };
            await transporter.sendMail(mailOptions);
          return {
            status:200, success:true, message: "Recharge successfull"
          };
        } catch (error) {
          return {
            status:500, message: error.message, error: error.message 
          };
        } finally {
          await connection.end();
        }

    } catch(err){
      return {
        status:500, message: 'Something went wrong'
      };
    }
  } catch (err) {
    return {
      status:400, message: 'Invalid Token' 
    };
  }
};
