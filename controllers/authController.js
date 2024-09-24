const db = require('../utils/db');
const {transporter} = require('../utils/email');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET_KEY = process.env.JWT_SECRET;

const login = async (req, res) => {

    const { email, password } = req.body;

    if (!email ||!password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM USERS WHERE email = ? AND isActive=1', [email]);
        if (rows.length > 0 && await bcrypt.compare(password, rows[0].password)) {
            const id = rows[0].uid;
            const name = rows[0].fullName;
            const verified = rows[0].isVerified;
            const admin = rows[0].isAdmin;
            const business_name = rows[0].businessName;
            const token = jwt.sign({ email, verified, name, id, business_name, admin }, SECRET_KEY, { expiresIn: '12h' });
            return res.status(200).json({
                status: 200, token: token, success: true, verified: verified
            });
        } else {
            return res.status(401).json( {
                status: 401, message: 'Invalid credentials'
            });
        }
    } catch (error) {
        return res.status(500).json({
            status: 500, message: 'Error logging in', error: error.message
        });
    }
}

const register = async (req, res) => {
    const { reg_email, reg_password, name, mobile, business_name } = req.body;
    const hashedPassword = await bcrypt.hash(reg_password, 10);

    try {
      const [users] = await db.query('SELECT * FROM USERS  WHERE email = ?', [reg_email]);
      if (users.length){
        return res.status(400).json( {
          status:400, message: "User is already registered. Please login"
        });
      }
      await db.query('INSERT INTO USERS (businessName, email, password, fullName, phone ) VALUES (?, ?, ?, ?,?)', [business_name, reg_email, hashedPassword, name, mobile]);
      let mailOptions = {
        from: process.env.EMAIL_USER,
        to: `${reg_email},${process.env.EMAIL_USER},${process.env.VERIFY_EMAIL}`, 
        subject: 'Registration Incomplete', 
        text: `Dear ${name}, \nYour registration on Jupiter Xpress is incomplete. Please verify your details to experience robust features of Jupiter Xpress. \n\n Regards, \nJupiter Xpress`
      };
      await transporter.sendMail(mailOptions)
      const [rows] = await db.query('SELECT * FROM USERS  WHERE email = ?', [reg_email]);
      const id = rows[0].uid
      const token = jwt.sign({  email : reg_email , verified : 0, name, id, business_name : business_name }, SECRET_KEY, { expiresIn: '12h' });
      return res.status(200).json({
        status:200, token : token ,message: 'User registered', success: true 
      });
    } catch (error) {
      return res.status(500).json({
        status:500, message: error.message
      });
    }
}

module.exports = { login, register }