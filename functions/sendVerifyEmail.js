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

  


exports.handler = async (event) => {

    try{
      const {email} = event.body;
      const generateOTP = () => {
        return Math.floor(100000 + Math.random() * 900000);
    }
    const otp = generateOTP();
    
      const connection = await mysql.createConnection(dbConfig);

        try {
            const [users] = await connection.execute('SELECT * FROM USERS WHERE email = ?',[email]);
            if (users.length == 0){
                throw new Error({message : 'User is not Registered'})
            }
            await connection.execute('UPDATE USERS set secret = ? WHERE email = ?',[otp,email]);
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email, 
                subject: 'OTP for email verification', 
                text: otp.toString(),
              };
            await transporter.sendMail(mailOptions);
          return {
            status:200, success: true,  message: `Otp sent to ${email}`
          };
        } catch (error) {
          return {
            status:500, message: error.message,error: error.message
          };
        } finally {
          await connection.end();
        }

    } catch(err){
      return {
        status:400, message: 'Something went wrong'
      };
    }
}
