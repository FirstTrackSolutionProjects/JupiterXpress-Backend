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

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id;
    try{
      const {
        address,
        state,
        city,
        pin,
        aadhar,
        pan,
        gst,
        msme,
        bank,
        ifsc,
        account,
        cin
        } = event.body;

        const connection = await mysql.createConnection(dbConfig);

        try {
          const [requests] = await connection.execute('SELECT * FROM KYC_UPDATE_REQUEST WHERE uid = ? AND status = "PENDING"',[id]);
          if (requests.length){
            return {
              status:400, message: 'You already have a pending KYC request' 
            };
          }
          const [insertRequest] = await connection.execute('INSERT INTO KYC_UPDATE_REQUEST (uid, address, city, state, pin ,aadhar_number, pan_number, gst, cin, accountNumber, ifsc, bank, msme) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, address, city, state, pin,  aadhar, pan, gst, cin, account, ifsc, bank, msme]);
          const reqId = insertRequest.insertId;
          const [users] = await connection.execute('SELECT * FROM USERS WHERE uid = ?', [id]);
          const email = users[0].email;
          const name = users[0].fullName;
          let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email, 
            subject: 'KYC Update Request is Incomplete', 
            text: `Dear ${name}, \n Your Request for KYC update of account on Jupiter Xpress is incomplete. Please upload your documents to finish the KYC update request.  \n\nRegards, \nJupiter Xpress`,
            
          };
        await transporter.sendMail(mailOptions);
          return {
            status:200, message: 'Details Submitted',  reqId:reqId
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
