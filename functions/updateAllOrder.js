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
    const admin = verified.admin;
    if (!admin) {
        return {
          status:400, message: 'Not an admin'
        };
    }
    try{
      let {
          wid,
          order,
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
          pickupTime,
        } = event.body;
        const connection = await mysql.createConnection(dbConfig);
        if (admin){
          const [users] = await connection.execute("SELECT * FROM WAREHOUSES w JOIN USERS u ON u.uid = w.uid WHERE w.wid = ?",[wid])
          id = users[0].uid
        }
        if(same){
          Baddress = address;
          BaddressType = addressType;
          Baddress2 = address2;
          BaddressType2 = addressType2;
          Bcountry = country;
          Bstate = state;
          Bcity = city;
          Bpostcode = postcode;
        }
        

        
          
        try {
          await connection.beginTransaction();
          await connection.execute(`UPDATE SHIPMENTS SET 
            pay_method = ?, 
            customer_name = ?, 
            customer_email = ?, 
            customer_mobile = ?, 
            shipping_address = ?, 
            shipping_address_type = ?, 
            shipping_address_2 = ?, 
            shipping_address_type_2 = ?, 
            shipping_country = ?, 
            shipping_state = ?, 
            shipping_city = ?, 
            shipping_postcode = ?, 
            billing_address = ?, 
            billing_address_type = ?, 
            billing_address_2 = ?, 
            billing_address_type_2 = ?, 
            billing_country = ?, 
            billing_state = ?, 
            billing_city = ?, 
            billing_postcode = ?,
            same = ?, 
            cod_amount = ?, 
            total_discount = ?, 
            gst = ?, 
            customer_gst = ?,
            wid = ?,
            shipping_mode =?,
            pickup_date =?,
            pickup_time =?
            WHERE ord_id = ? AND uid = ?`, 
            [ payMode, name, email, phone, address, addressType, address2, addressType2, country, state, city, postcode, Baddress, BaddressType, Baddress2, BaddressType2, Bcountry, Bstate, Bcity, Bpostcode, same ,cod, discount,  gst, Cgst,  wid , shippingType, pickupDate , pickupTime,order, id]
          );
          
          await connection.execute("DELETE FROM ORDERS WHERE ord_id = ?",[order]);
          await connection.execute("DELETE FROM SHIPMENT_PACKAGES WHERE ord_id = ?",[order]);

          for (let i = 0; i < boxes.length; i++) {
              await connection.execute(
              `INSERT INTO SHIPMENT_PACKAGES (ord_id, box_no, length, breadth, height, weight ) VALUES (?, ?, ?, ?, ?, ?)`,
              [
                order,
                boxes[i].box_no, 
                boxes[i].length,
                boxes[i].breadth,
                boxes[i].height,
                boxes[i].weight,
              ]
            );
            
          }
          for (let j = 0; j < orders.length; j++) {
            await connection.execute(
              `INSERT INTO ORDERS (ord_id, box_no, product_name, product_quantity, tax_in_percentage, selling_price) VALUES (?,?,?,?,?,?)`,
              [
                order,
                orders[j].box_no,
                orders[j].product_name,
                orders[j].product_quantity,
                orders[j].tax_in_percentage,
                orders[j].selling_price
              ]
            );
          }
          await connection.commit();
        return {
          status:200, success:true, message: 'Details Updated', id : id
        };
      } 
      catch (error) {
        return {
          status:500, message: error.message, error: error.message
        };
      }
       finally {
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
