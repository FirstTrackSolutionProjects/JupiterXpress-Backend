const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// Secret key for JWT
const SECRET_KEY = process.env.JWT_SECRET;

exports.handler = async (event) => {

  const { email, password } = event.body;
  

  const connection = await mysql.createConnection(dbConfig);

  try {
    const [rows] = await connection.execute('SELECT * FROM USERS WHERE email = ? AND isActive=1', [email]);
    if (rows.length > 0 && await bcrypt.compare(password, rows[0].password)) {
      const id = rows[0].uid;
      const name = rows[0].fullName;
      const verified = rows[0].isVerified;
      const admin = rows[0].isAdmin;
      const business_name = rows[0].businessName;
      const token = jwt.sign({  email, verified, name, id, business_name, admin }, SECRET_KEY, { expiresIn: '12h' });
      return {
        status:200, token : token, success:true, verified: verified
      };
    } else {
      return {
        status:401, message: 'Invalid credentials'
      };
    }
  } catch (error) {
    return {
      status:500, message: 'Error logging in', error: error.message
    };
  } finally {
    await connection.end();
  }
};
