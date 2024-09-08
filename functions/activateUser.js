const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET;

exports.handler = async (event, context) => {
  const token = event.headers.Authorization;
  if (!token) {
    return {
      status : 401, message: "Access Denied" 
    };
  }
  try{
    const verified = jwt.verify(token, SECRET_KEY);
    const {uid} = event.body;
  // Connect to MySQL database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  let transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, 
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  

  try {
    await connection.execute('UPDATE USERS set isActive=1 where uid = ?', [uid]);
    const [users] = await connection.execute("SELECT * FROM USERS WHERE uid = ?", [uid]);
             const {email , fullName} = users[0];
             let mailOptions = {
              from: process.env.EMAIL_USER,
              to: email,  
              subject: 'Your account has been activated', 
              text: `Dear ${fullName}, \nYour account has been re-activated.\n\nRegards,\nJupiter Xpress`
            };
            await transporter.sendMail(mailOptions);
    return {
      status : 200, success: true, message: 'Account has been activated successfully'
    };
  } catch (error) {
    return {
     status : 500,  error: error.message 
    };
  } finally {
    await connection.end();
  }
  } catch(e){
    return {
     status : 400, message: 'Invalid Token' 
    };
  }
};
