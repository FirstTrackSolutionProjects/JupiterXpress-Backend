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
    return verified
  } catch(e){
    return {
      status:400, message: 'Invalid Token'
    };
  }

};
