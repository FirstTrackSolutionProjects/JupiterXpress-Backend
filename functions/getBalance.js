const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const SECRET_KEY = process.env.JWT_SECRET;

exports.handler = async (event, context) => {
  const token = event.headers.Authorization;
  if (!token) {
    return {
      status:401, message: "Access Denied"
    };
  }
  try{
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id;
  // Connect to MySQL database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [rows] = await connection.execute('SELECT * FROM WALLET WHERE uid = ?', [id]);

    if (rows.length === 0) {
      return {
        status:404, error: 'User not found'
      };
    }

    const balance = rows[0].balance;

    return {
      status:200, balance
    };
  } catch (error) {
    return {
      status:500, error: error.message
    };
  } finally {
    connection.end();
  }
  } catch(e){
    return {
      status:400, message: 'Invalid Token'
    };
  }

};
