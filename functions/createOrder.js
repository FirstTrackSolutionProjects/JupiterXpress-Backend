const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
require("dotenv").config();

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
      status: 401, message: "Access Denied" 
    }
  }

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id;
    try {
      let {
        wid,
        payMode,
        name,
        email,
        phone,
        address,
        address2,
        addressType,
        addressType2,
        postcode,
        city,
        state,
        country,
        Baddress,
        Baddress2,
        BaddressType,
        BaddressType2,
        Bpostcode,
        Bcity,
        Bstate,
        Bcountry,
        same,
        boxes,
        orders,
        discount,
        cod,
        gst,
        Cgst,
        shippingType,
        pickupDate,
        pickupTime
      } = event.body;
      if (same) {
        Baddress = address;
        BaddressType = addressType;
        Baddress2 = address2;
        BaddressType2 = addressType2;
        Bcountry = country;
        Bstate = state;
        Bcity = city;
        Bpostcode = postcode;
      }

      const connection = await mysql.createConnection(dbConfig);

      try {
        await connection.beginTransaction();
        const [orderIds] = await connection.execute("SELECT domestic_order_ids FROM SYSTEM_CODE_GENERATOR");
        const order = `JUPXD${orderIds[0].domestic_order_ids}`;
        await connection.execute("UPDATE SYSTEM_CODE_GENERATOR SET domestic_order_ids = domestic_order_ids + 1")
        await connection.execute(
          `INSERT INTO SHIPMENTS (
  uid,
  ord_id,
  pay_method,
  customer_name,
  customer_email,
  customer_mobile,
  shipping_address,
  shipping_address_type,
  shipping_address_2,
  shipping_address_type_2,
  shipping_country,
  shipping_state,
  shipping_city,
  shipping_postcode,
  billing_address,
  billing_address_type,
  billing_address_2,
  billing_address_type_2,
  billing_country,
  billing_state,
  billing_city,
  billing_postcode,
  cod_amount,
  total_discount,
  gst,
  customer_gst,
  wid,
  same,
  shipping_mode,
  pickup_date,
  pickup_time
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?, ?, ?, ?,?, ?,?,?)`,
          [
            id,
            order,
            payMode,
            name,
            email,
            phone,
            address,
            addressType,
            address2,
            addressType2,
            country,
            state,
            city,
            postcode,
            Baddress,
            BaddressType,
            Baddress2,
            BaddressType2,
            Bcountry,
            Bstate,
            Bcity,
            Bpostcode,
            cod,
            discount,
            gst,
            Cgst,
            wid,
            same,
            shippingType,
            pickupDate,
            pickupTime
          ]
        );
        for (let i = 0; i < boxes.length; i++) {
          await connection.execute(
            `INSERT INTO SHIPMENT_PACKAGES (ord_id, box_no, length, breadth, height, weight) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              order,
              boxes[i].box_no,
              boxes[i].length,
              boxes[i].breadth,
              boxes[i].height,
              boxes[i].weight
            ]
          );
        }
        for (let i = 0; i < orders.length; i++) {
          await connection.execute(
            `INSERT INTO ORDERS VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              order,
              orders[i].box_no,
              null,
              orders[i].product_name,
              orders[i].product_quantity,
              orders[i].tax_in_percentage,
              orders[i].selling_price,
              null
            ]
          );
        }
        await connection.commit();
        return {
          status:200, success: true, message: "Details Submitted" 
        };
      } 
      catch (error) {
        return {
            status:500,
            message: error.message + id,
            orders: orders,
            error: error.message,
        };
      } 
      finally {
        await connection.end();
      }
    } 
    catch (err) {
      return {
        status: 400, message: "Something went wrong"
      };
    }
    // finally{}
  } 
  catch (err) {
    return {
      status:400, message: "Invalid Token" 
    };
  }
  // finally{}
};
