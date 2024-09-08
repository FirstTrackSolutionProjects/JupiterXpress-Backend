// netlify/functions/authenticate.js
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET;

exports.handler = async (event, context) => {
 
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    const {email} = event.body;
    
    const [rows] = await connection.execute('SELECT * FROM USERS WHERE email = ?', [email]);
    const emailVerified = rows[0].emailVerified;
        return {
            status:200, emailVerified : emailVerified 
          };
    
      

  } catch (error) {
    return {
      status:500, message: error.message , success: false 
    };
  } finally {
    await connection.end()
  }
};
