// netlify/functions/fetchData.js
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET

exports.handler = async (event, context) => {
    const {
        name,
        email,
        phone,
        address,
        city,
        state,
        country,
        pin
  } = event.body
  const token = event.headers.Authorization
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    const verified = jwt.verify(token, SECRET_KEY)
    const id = verified.id
    
        await connection.beginTransaction();
        await connection.execute('INSERT INTO WAREHOUSES (uid, warehouseName, address, phone, pin) VALUES (?,?,?,?,?)', [id, name, address, phone, pin]);
    const delhivery_500 = await fetch(`https://track.delhivery.com/api/backend/clientwarehouse/create/`, {
        method: 'POST',
        headers: {
        'Authorization': `Token ${process.env.DELHIVERY_500GM_SURFACE_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        },
        body: JSON.stringify({name, email, phone, address, city, state, country, pin, return_address:address, return_pin:pin, return_city:city, return_state:state, return_country:country})
    });
    const delhivery_10 = await fetch(`https://track.delhivery.com/api/backend/clientwarehouse/create/`, {
        method: 'POST',
        headers: {
        'Authorization': `Token ${process.env.DELHIVERY_10KG_SURFACE_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        },
        body: JSON.stringify({name, email, phone, address, city, state, country, pin, return_address:address, return_pin:pin, return_city:city, return_state:state, return_country:country})
    });
  //   const response2 = await fetch(`https://track.delhivery.com/api/backend/clientwarehouse/create/`, {
  //     method: 'POST',
  //     headers: {
  //     'Authorization': `Token ${process.env.DELHIVERY_10KG_SURFACE_KEY}`,
  //     'Content-Type': 'application/json',
  //     'Accept': 'application/json'
  //     },
  //     body: JSON.stringify({name, email, phone, address, city, state, country, pin, return_address:address, return_pin:pin, return_city:city, return_state:state, return_country:country})
  // });
    const data = await delhivery_500.json();
    const data2 = await delhivery_10.json();
    if (!data.success || !data2.success){
        return {
            status:400, success: false, message: data.error + data2.error
          };
    }
    try {
        
        await connection.commit();

      } catch (error) {
        return {
          status:500, message: error.message , success: false
        };
      }
    return {
      status:200, success: true, message:data.data.message
    };
  } catch (error) {
    return {
      status:501, success:false,  message: error.message + token 
    };
  } finally {
    connection.end()
  }
};
