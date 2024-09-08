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
  const token = event.headers.Authorization;
  const connection = await mysql.createConnection(dbConfig);

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id;
    const admin = verified.admin;
    if (admin){
        const [rows] = await connection.execute('SELECT * FROM EXPENSES e JOIN USERS u ON e.uid = u.uid');
    
      
      return {
        status:200, success:true, data : rows
      };
    }
    const [rows] = await connection.execute('SELECT * FROM EXPENSES where uid = ?',[id]);
    
      
      return {
        status:200, success:true, data : rows
      };
    
  } catch (error) {
    return {
      status:500, message: 'Unexpected Error while fetching transactions', error: error.message
    };
  } finally {
    await connection.end();
  }
};
