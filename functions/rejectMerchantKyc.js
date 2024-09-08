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
  const {uid, reqId} = event.body;
  try {
    const verified = jwt.verify(token, SECRET_KEY);
    const admin = verified.admin;
    const id = verified.id;
    if (!admin){
      return {
        status:400, message: 'Not an admin'
      };
    }
    try{
          
          const connection = await mysql.createConnection(dbConfig);
          try {
             await connection.execute("UPDATE KYC_UPDATE_REQUEST SET status='REJECTED', actionBy=? WHERE reqId = ?", [id,reqId]);
             const [users] = await connection.execute("SELECT * FROM USERS WHERE uid = ?", [uid]);
             const {email , fullName} = users[0];
             let mailOptions = {
              from: process.env.EMAIL_USER,
              to: email,  
              subject: 'KYC verification is rejected', 
              text: `Dear ${fullName}, \nWe were not able to verify your documents due to some reason. Please try again.`
            };
            await transporter.sendMail(mailOptions);
          return {
            status:200, success:true, message: 'KYC verification rejected'
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
