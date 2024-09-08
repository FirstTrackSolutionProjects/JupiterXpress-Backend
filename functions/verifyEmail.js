const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();
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

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

exports.handler = async (event) => {


    try{
      const {email, otp} = event.body;
      const connection = await mysql.createConnection(dbConfig);
        try {
            const [users] = await connection.execute('SELECT * FROM USERS WHERE email = ?',[email]);
            if (users.length == 0){
              throw new Error({message : 'User not Found'})
            }
            const inOtp = users[0].secret;
            if (inOtp == otp){
              await connection.beginTransaction();
              await connection.execute('UPDATE USERS SET emailVerified = ? WHERE email = ?',[1, email])
              await connection.execute('UPDATE USERS SET secret = ? WHERE email = ?',[null, email])
              await connection.commit();
            }
            const {fullName} = users[0];
            let mailOptions = {
              from: process.env.EMAIL_USER,
              to: email, 
              subject: 'Email Verified Successfully', 
              text: `Dear ${fullName}, \nYour account email has been verified.\nRegards,\nJupiter Xpress`
            };
          await transporter.sendMail(mailOptions);
          return {
            status:200, success: true,  message: 'Email Verified'
          };
        } catch (error) {
          return {
            status:500, message: error.message ,error: error.message
          };
        } finally {
          await connection.end();
        }

    } catch(err){
      return {
        status:500, message: 'Something went wrong'
      }
    }
}
