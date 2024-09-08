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
  const {uid, kycId} = event.body;
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
            
            const [req] = await connection.execute("SELECT * FROM KYC_UPDATE_REQUEST WHERE kycId = ? ", [kycId]);
            const userData = req[0];
            await connection.execute("UPDATE USER_DATA SET address = ?, state = ?, city =?, pin =?, aadhar_number=?, pan_number=?, gst=?, cin =?,msme=?, accountNumber=?, ifsc=?, bank=?, aadhar_doc=?, pan_doc=?, selfie_doc=?, gst_doc=?, cancelledCheque=? WHERE uid = ? ",[ userData.address, userData.state, userData.city, userData.pin, userData.aadhar_number, userData.pan_number, userData.gst, userData.cin, userData.msme, userData.accountNumber, userData.ifsc, userData.bank, userData.aadharDoc, userData.panDoc, userData.selfieDoc, userData.gstDoc, userData.cancelledCheque, uid])
             await connection.execute("UPDATE KYC_UPDATE_REQUEST SET status='ACCEPTED', actionBy=? WHERE kycId = ? ", [id,kycId]);
             const [users] = await connection.execute("SELECT * FROM USERS WHERE uid = ?", [uid]);
             const {email , fullName} = users[0];
             let mailOptions = {
              from: process.env.EMAIL_USER,
              to: email,  
              subject: 'KYC has been verified', 
              text: `Dear ${fullName}, \nYour account KYC has been verified and your profile is updated according to it. Login now and take the experience of our minimal documentation domestic and international shipments`
            };
            await transporter.sendMail(mailOptions);
          return {
            status:200, success:true, message: 'KYC successfully verified'
          }
        } catch (error) {
          return {
            status:500, message: error.message, error: error.message
          }
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
