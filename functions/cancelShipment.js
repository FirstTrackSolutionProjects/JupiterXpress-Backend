const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, 
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
const SECRET_KEY = process.env.JWT_SECRET;

exports.handler = async (event) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const token = event.headers.Authorization;
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id;
    const {order} = event.body;
    const [shipments] = await connection.execute('SELECT * FROM SHIPMENTS WHERE ord_id = ?', [order]);
    const shipment = shipments[0];
    const {serviceId, categoryId, awb, uid} = shipment;
    const [users] = await connection.execute('SELECT * FROM USERS WHERE uid = ?', [uid]);
    const email = users[0].email;
    // const [orders] = await connection.execute('SELECT * FROM ORDERS WHERE ord_id = ? ', [order]);
    
    if (serviceId == "1") {
    
      
    const responseDta = await fetch(`https://track.delhivery.com/api/p/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Token ${categoryId == "2"?process.env.DELHIVERY_500GM_SURFACE_KEY:categoryId=="1"?process.env.DELHIVERY_10KG_SURFACE_KEY:categoryId==3?'':''}`
      },
      body : JSON.stringify({waybill : awb, cancellation : true})
    })
    const response = await responseDta.json()
    if (response.status){
      await connection.beginTransaction()
      const [expenses] = await connection.execute('SELECT * FROM EXPENSES WHERE expense_order = ? AND uid = ?',[order,uid])
      const price = expenses[0].expense_cost
      await connection.execute('UPDATE SHIPMENTS set cancelled = ? WHERE awb = ? AND uid = ?', [1, awb, uid])
      if (shipment.pay_method != "topay"){
        await connection.execute('UPDATE WALLET SET balance = balance + ? WHERE uid = ?', [parseInt(price), uid]);
        await connection.execute('INSERT INTO REFUND (uid, refund_order, refund_amount) VALUES  (?,?,?)',[uid, order, price])
      }
      await connection.commit()
    }
    else{
      return {
       status : 200, success : false, message : response
      };
    }
    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: email, 
      subject: 'Shipment cancelled successfully', 
      text: `Dear Merchant, \nYour shipment request for Order id : ${order} is successfully cancelled and the corresponding refund is credited to your wallet.\nRegards,\nJupiter Xpress`
    };
    await transporter.sendMail(mailOptions)
    return {
      status : 200, message : response, success : true
    }
    }
    
  } catch (error) {
    return {
      status: 504, response : error, success : false
    };
  } finally {
    connection.end()
  }
};
