const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const SECRET_KEY = process.env.JWT_SECRET;

exports.handler = async (event) => {
  const token = event.headers.Authorization;
  if (!token) {
    return {
      status: 401,
      message: "Access Denied",
    };
  }
  try {
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id;
    try {
      const { oldPassword, newPassword } = event.body;
      const connection = await mysql.createConnection(dbConfig);

      try {
        const [users] = await connection.execute(
          "SELECT * FROM USERS WHERE uid = ?",
          [id]
        );
        
        if (!(await bcrypt.compare(oldPassword, users[0].password))){
            return {
                status: 400,
                success: false, 
                message: "Wrong Password",
              };
        }
          await connection.beginTransaction();
          await connection.execute(
            "UPDATE USERS SET password = ? WHERE uid = ?",
            [await bcrypt.hash(newPassword, 10), id]
          );
          await connection.commit();
        
        return {
          status: 200,
          success: true, 
          message: "Password Changed",
        };
      } catch (error) {
        return {
          status: 500,
          message: error.message,
          error: error.message,
        };
      } finally {
        await connection.end();
      }
    } catch (err) {
      return {
        status: 400,
        message: "Something went wrong",
      };
    }
  } catch (e) {
    return {
      status: 400,
      message: "Invalid Token",
    };
  }
};
