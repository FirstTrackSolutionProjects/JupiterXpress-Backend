// netlify/functions/authenticate.js
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET;

exports.handler = async (event, context) => {
  const token = event.headers.Authorization;
  const verified = jwt.verify(token, SECRET_KEY);
  const admin = verified.admin;
  if (!admin) {
    return {
      status:400, message: 'Access Denied'
    };
  }
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [rows] = await connection.execute('SELECT * FROM SHIPMENT_REPORTS r JOIN SHIPMENTS s ON r.ord_id=s.ord_id JOIN USERS u ON u.uid=s.uid WHERE r.status != "FAILED"');
      return { 
        status:200, rows , success : true 
      };





  } catch (error) {
    return {
      status:500, message: error.message , success: false
    };
  } finally { 
    connection.end();
  }
};
