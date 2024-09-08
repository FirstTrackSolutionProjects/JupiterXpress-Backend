const jwt = require('jsonwebtoken');
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
  const token = event.headers.Authorization
  const connection = await mysql.createConnection(dbConfig);

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id
    const [rows] = await connection.execute('SELECT * FROM USERS NATURAL JOIN USER_DATA WHERE uid = ?', [id]);
    if (rows.length > 0) {
      return {
        status:200, success:true, data : rows[0]
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
