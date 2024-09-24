const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { transporter } = require('../utils/email');

const SECRET_KEY = process.env.JWT_SECRET;

const cancelShipment = async (req, res) => {
    try {
        const token = req.headers.Authorization;
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const { order } = req.body;
        const [shipments] = await db.query('SELECT * FROM SHIPMENTS WHERE ord_id = ?', [order]);
        const shipment = shipments[0];
        const { serviceId, categoryId, awb, uid } = shipment;
        const [users] = await db.query('SELECT * FROM USERS WHERE uid = ?', [uid]);
        const email = users[0].email;
        // const [orders] = await db.query('SELECT * FROM ORDERS WHERE ord_id = ? ', [order]);

        if (serviceId == "1") {


            const responseDta = await fetch(`https://track.delhivery.com/api/p/edit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Token ${categoryId == "2" ? process.env.DELHIVERY_500GM_SURFACE_KEY : categoryId == "1" ? process.env.DELHIVERY_10KG_SURFACE_KEY : categoryId == 3 ? '' : ''}`
                },
                body: JSON.stringify({ waybill: awb, cancellation: true })
            })
            const response = await responseDta.json()
            if (response.status) {
                const transaction = await db.beginTransaction()
                const [expenses] = await transaction.query('SELECT * FROM EXPENSES WHERE expense_order = ? AND uid = ?', [order, uid])
                const price = expenses[0].expense_cost
                await transaction.query('UPDATE SHIPMENTS set cancelled = ? WHERE awb = ? AND uid = ?', [1, awb, uid])
                if (shipment.pay_method != "topay") {
                    await transaction.query('UPDATE WALLET SET balance = balance + ? WHERE uid = ?', [parseInt(price), uid]);
                    await transaction.query('INSERT INTO REFUND (uid, refund_order, refund_amount) VALUES  (?,?,?)', [uid, order, price])
                }
                await db.commit(transaction)
            }
            else {
                return {
                    status: 200, success: false, message: response
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
                status: 200, message: response, success: true
            }
        }

    } catch (error) {
        return {
            status: 504, response: error, success: false
        };
    } 
}

module.exports = { cancelShipment };

