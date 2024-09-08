// netlify/functions/authenticate.js
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET;

exports.handler = async (event, context) => {

  const token = event.headers.Authorization;
  const verified = jwt.verify(token, SECRET_KEY);
  const id = verified.id;
  const admin = verified.admin;
  if (!id) {
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
    if (admin){
        const [warehouses] = await connection.execute('SELECT COUNT(*) AS warehouses FROM WAREHOUSES');
         const warehouse = warehouses[0].warehouses;
         const [shipments] = await connection.execute('SELECT COUNT(*) AS shipments FROM SHIPMENTS');
         const shipment = shipments[0].shipments;
         const [merchants] = await connection.execute('SELECT COUNT(*) AS merchants FROM USERS WHERE isAdmin=0 AND isVerified=1 ')
         const merchant = merchants[0].merchants;
         const [delivereds] = await connection.execute('SELECT COUNT(*) AS delivereds FROM SHIPMENT_REPORTS WHERE status = "Delivered" ')
         const delivered = delivereds[0].delivereds;
         const [unDelivereds] = await connection.execute('SELECT COUNT(*) AS unDelivereds FROM SHIPMENT_REPORTS WHERE status = "SHIPPED" OR status = "Manifested" ')
         const unDelivered = unDelivereds[0].unDelivereds;
         const [inTransits] = await connection.execute('SELECT COUNT(*) AS inTransits FROM SHIPMENT_REPORTS WHERE status = "In Transit" ')
         const inTransit = inTransits[0].inTransits;
         const expense = await connection.execute('SELECT * FROM EXPENSES')
         const refunds = await connection.execute('SELECT * FROM REFUND')
         let total_expense = 0;
         for (let i = 0; i < expense[0].length; i++) {
           total_expense += parseFloat(expense[0][i].expense_cost)
         }
         let total_refund = 0;
         for (let i = 0; i < refunds[0].length; i++){
          total_refund += parseFloat(refunds[0][i].refund_amount)
         }
         const net_expense = total_expense - total_refund;
         const revenue = ((net_expense/1.3)*0.3).toFixed(2)
          return {
            status:200, warehouse, shipment , merchant, delivered, unDelivered ,inTransit, revenue, expense: expense[0][0].expense_cost, refunds ,success : true
          };
    } else{
        const [warehouses] = await connection.execute('SELECT COUNT(*) AS warehouses FROM WAREHOUSES WHERE uid = ? ', [id]);
         const warehouse = warehouses[0].warehouses;
         const [shipments] = await connection.execute('SELECT COUNT(*) AS shipments FROM SHIPMENTS WHERE  uid =?', [id]);
         const shipment = shipments[0].shipments;
         const [delivereds] = await connection.execute('SELECT COUNT(*) AS delivereds FROM SHIPMENT_REPORTS r JOIN SHIPMENTS s ON r.ord_id=s.ord_id WHERE r.status = "Delivered" AND s.uid = ? ',[id])
         const delivered = delivereds[0].delivereds;
         const [unDelivereds] = await connection.execute('SELECT COUNT(*) AS unDelivereds FROM SHIPMENT_REPORTS r JOIN SHIPMENTS s ON r.ord_id=s.ord_id WHERE r.status = "Delivered" AND s.uid = ? ',[id])
         const unDelivered = unDelivereds[0].unDelivereds;
         const [inTransits] = await connection.execute('SELECT COUNT(*) AS inTransits FROM SHIPMENT_REPORTS r JOIN SHIPMENTS s ON r.ord_id=s.ord_id WHERE r.status = "Delivered" AND s.uid = ? ',[id])
         const inTransit = inTransits[0].inTransits;
         const [walletRecharges] = await connection.execute('SELECT * FROM RECHARGE where uid = ? ', [id]);
         const [manualRecharges] = await connection.execute('SELECT * FROM MANUAL_RECHARGE where beneficiary_id = ? ', [id])
         let total_recharge = 0;
         for (let i = 0; i < walletRecharges.length; i++){
           total_recharge += parseFloat(walletRecharges[i].amount);
         }
         for (let i = 0; i < manualRecharges.length; i++){
          total_recharge += parseFloat(manualRecharges[i].amount);
        }
         return {
            status:200, warehouse, shipment, delivered, unDelivered, inTransit , total_recharge , success : true 
          };
    }

      





  } catch (error) {
    return {
      status:500, message: error.message , success: false 
    };
  } finally { 
    connection.end();
  }
};
