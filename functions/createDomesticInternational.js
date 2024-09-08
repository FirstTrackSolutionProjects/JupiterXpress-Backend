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

let transporter = nodemailer.createTransport({
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
    const [users] = await connection.execute('SELECT * FROM USERS WHERE uid =?', [id]);
    const email = users[0].email;
    const { did, price, serviceId, categoryId } = event.body;
    const [dockets] = await connection.execute('SELECT * FROM DOCKETS WHERE did = ? ', [did]);
    const docket = dockets[0];
    const [shipments] = await connection.execute('SELECT * FROM INTERNATIONAL_SHIPMENTS WHERE iid = ?', [docket.iid]);
    const shipment = shipments[0];
    const [items] = await connection.execute('SELECT * FROM DOCKET_ITEMS WHERE did = ? ', [did]);
    const [warehouses] = await connection.execute('SELECT * FROM WAREHOUSES WHERE uid = ? AND wid = ?', [id, shipment.wid]);
    const warehouse = warehouses[0];
    const [systemCodes] = await connection.execute('SELECT * FROM SYSTEM_CODE_GENERATOR');
    const refId = systemCodes[0].shipment_reference_id;
    await connection.execute('UPDATE SYSTEM_CODE_GENERATOR SET shipment_reference_id = ? WHERE shipment_reference_id = ?', [parseInt(refId) + 1, refId]);

    let total_amount = 0;
    for (let i = 0; i < items.length; i++) {
      total_amount += (parseFloat(items[i].rate) * parseFloat(items[i].quantity));
    }
    
    let product_description = "";
    for (let i = 0; i < items.length; i++) {
      product_description += `${items[i].description} (${items[i].quantity}) (₹${items[i].rate})\n`;
    }
    
    if (serviceId == "1") {
      const res = await fetch(`https://track.delhivery.com/waybill/api/bulk/json/?count=1`, {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          'Authorization': `Token ${categoryId == "2" ? process.env.DELHIVERY_500GM_SURFACE_KEY : categoryId == "1" ? process.env.DELHIVERY_10KG_SURFACE_KEY : categoryId == 3 ? '' : ''}`
        }
      });
      
      const waybill = await res.json();
      let req = {
        shipments: [],
        pickup_location: {
          name: warehouse.warehouseName,
          add: warehouse.address,
          pin_code: warehouse.pin,
          phone: warehouse.phone,
        }
      };
      
      req.shipments.push({
        "name": "FlightGo",
        "add": "Delhi",
        "pin": "110037",
        "city": "Delhi",
        "state": "Delhi",
        "country": "India",
        "phone": "1234567890",
        "order": `JUP${refId}`,
        "payment_mode": "Pre-paid",
        "products_desc": product_description,
        "order_date": shipment.invoice_date,
        "total_amount": total_amount,
        "seller_add": warehouse.address,
        "seller_name": warehouse.warehouseName,
        "waybill": waybill,
        "shipment_length": docket.length,
        "shipment_width": docket.breadth,
        "shipment_height": docket.height,
        "weight": docket.actual_weight,
        "seller_gst_tin": shipment.gst,
        "shipping_mode": shipment.shippingType,
        "address_type": "Office"
      });

      const formData = new URLSearchParams();
      formData.append('format', 'json');
      formData.append('data', JSON.stringify(req));

      const responseDta = await fetch(`https://track.delhivery.com/api/cmu/create.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization': `Token ${categoryId == "2" ? process.env.DELHIVERY_500GM_SURFACE_KEY : categoryId == "1" ? process.env.DELHIVERY_10KG_SURFACE_KEY : categoryId == 3 ? '' : ''}`
        },
        body: formData
      });

      const response = await responseDta.json();
      if (response.success) {
        await connection.beginTransaction();
        await connection.execute('UPDATE INTERNATIONAL_SHIPMENTS set serviceId = ?, categoryId = ? WHERE iid = ?', [serviceId, categoryId, docket.iid]);
        await connection.execute('UPDATE DOCKETS set awb = ? WHERE did = ?', [response.packages[0].waybill, did]);
        if (shipment.pay_method != "topay") {
          await connection.execute('UPDATE WALLET SET balance = balance - ? WHERE uid = ?', [parseFloat(price), id]);
        }
        await connection.commit();
      } else {
        return {
          status: 400,
          success: false,
          message: response,
        };
      }

      let mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Shipment created successfully',
        text: `Dear Merchant, \nYour shipment request for Ref id : JUP${refId} is successfully created at Delhivery Courier Service and the corresponding charge is deducted from your wallet.\nRegards,\nJupiter Xpress`
      };
      await transporter.sendMail(mailOptions);

      return {
        status: 200,
        response: response,
        success: true
      };
    }

  } catch (error) {
    return {
      status: 504,
      response: error,
      success: false
    };
  } finally {
    await connection.end();
  }
};
