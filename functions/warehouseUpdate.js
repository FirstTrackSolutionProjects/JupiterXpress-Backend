// netlify/functions/fetchData.js
const mysql = require('mysql2/promise');


exports.handler = async (event, context) => {
    const {
        name,
        phone,
        address,
        pin
  } = event.body
  try {
    const response = await fetch(`https://track.delhivery.com/api/backend/clientwarehouse/edit/`, {
        method: 'POST',
        headers: {
        'Authorization': `Token ${process.env.DELHIVERY_500GM_SURFACE_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        },
        body: JSON.stringify({name,  phone, address, pin})
    });
    const response2 = await fetch(`https://track.delhivery.com/api/backend/clientwarehouse/edit/`, {
      method: 'POST',
      headers: {
      'Authorization': `Token ${process.env.DELHIVERY_10KG_SURFACE_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
      },
      body: JSON.stringify({name,  phone, address, pin})
  });
    const data = await response.json();
    const data2 = await response2.json();
    if (!data.success || !data2.success){
        return {
            status:400, success: false, message: data.error + data2.error
          };
    }
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    try {
        
        await connection.execute('UPDATE WAREHOUSES set address = ?, phone = ?, pin = ? WHERE warehouseName = ?', [ address, phone, pin, name]);

      } catch (error) {
        return {
          status:500, message: error.message , success: false
        };
      } finally{
        connection.end()
      }
    return {
      status:200, success: true, message:data.data.message
    };
  } catch (error) {
    return {
      status : 501,success:false,  message: error
    };
  }
};
