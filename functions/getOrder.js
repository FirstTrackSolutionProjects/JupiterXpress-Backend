const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
require("dotenv").config();

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
  if (!token) {
    return {
     status:401, message: "Access Denied"
    };
  }
  try {
    const verified = jwt.verify(token, SECRET_KEY);
    const { order } = event.body;

    const connection = await mysql.createConnection(dbConfig);

    try {
      const [rows] = await connection.execute(
        "SELECT * FROM ORDERS WHERE ord_id = ?",
        [order]
      );
      if (rows.length > 0) {
        return {
          status:200, success: true, order: rows
        };
      } else {
        return {
          status:401, message: "Invalid id"
        };
      }
    } catch (error) {
      return {
        
          status:500,
          message: "Unexpected Error while getting orders",
          error: error.message

      };
    } finally {
      await connection.end();
    }
  } catch (err) {
    return {
      status:401, message: "Access Denied"
    };
  }
};
