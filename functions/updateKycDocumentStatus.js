const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
require('dotenv').config();


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
      status:401, message: 'Access Denied' 
    };
  }

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id;
    const { name, key } = event.body;
    try{
          const connection = await mysql.createConnection(dbConfig);
          try {
            const [req] = await connection.execute(`UPDATE KYC_UPDATE_REQUEST set ${name} = ? WHERE status='INCOMPLETE' AND uid = ?`, [ key, id]);
          return {
            status:200, success:true
          };
        } catch (error) {
          return {
            status:500, message: error.message, error: error.message 
          };
        } finally {
          await connection.end();
        }

    } catch(err){
      return {
        status:500, message: 'Something went wrong'
      };
    }
  } catch (err) {
    return {
      status:400, message: 'Invalid Token'
    };
  }
};
