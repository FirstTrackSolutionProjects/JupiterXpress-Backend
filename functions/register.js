const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Database connection
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const SECRET_KEY = process.env.JWT_SECRET;

let transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, 
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
exports.handler = async (event) => {

  const { reg_email, reg_password, name, mobile, business_name } = event.body;
  const hashedPassword = await bcrypt.hash(reg_password, 10);

  const connection = await mysql.createConnection(dbConfig);

  try {
    const [users] = await connection.execute('SELECT * FROM USERS  WHERE email = ?', [reg_email]);
    if (users.length){
      return {
        status:400, message: "User is already registered. Please login"
      };
    }
    await connection.execute('INSERT INTO USERS (businessName, email, password, fullName, phone ) VALUES (?, ?, ?, ?,?)', [business_name, reg_email, hashedPassword, name, mobile]);
    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: `${reg_email},${process.env.EMAIL_USER},${process.env.VERIFY_EMAIL}`, 
      subject: 'Registration Incomplete', 
      text: `Dear ${name}, \nYour registration on Jupiter Xpress is incomplete. Please verify your details to experience robust features of Jupiter Xpress. \n\n Regards, \nJupiter Xpress`
    };
    await transporter.sendMail(mailOptions)
    const [rows] = await connection.execute('SELECT * FROM USERS  WHERE email = ?', [reg_email]);
    const id = rows[0].uid
    const token = jwt.sign({  email : reg_email , verified : 0, name, id, business_name : business_name }, SECRET_KEY, { expiresIn: '12h' });
    return {
      status:200, token : token ,message: 'User registered', success: true 
    };
  } catch (error) {
    return {
      status:500, message: error.message
    };
  } finally {
    await connection.end();
  }
};
