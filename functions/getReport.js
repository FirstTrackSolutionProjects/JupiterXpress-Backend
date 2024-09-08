// netlify/functions/authenticate.js
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config();



const SECRET_KEY = process.env.JWT_SECRET;

exports.handler = async (event, context) => {

  const token = event.headers.Authorization;
  const verified = jwt.verify(token, SECRET_KEY);
  const id = verified.id;
  if (!id) {
    return {
      status:400, message: 'Access Denied'
    };
  }
  const {ref_id} = event.body
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
      const [shipments] = await connection.execute("SELECT * FROM SHIPMENTS s JOIN SHIPMENT_REPORTS r ON s.ord_id = r.ord_id WHERE r.ref_id = ?", [ref_id])
      const shipment = shipments[0]
      const awb = shipment.awb
      const serviceId = shipment.serviceId
      const categoryId = shipment.categoryId
      if (serviceId == 1){
        const response = await fetch(`https://track.delhivery.com/api/v1/packages/json/?ref_ids=JUP${ref_id}`, {
            headers: {
              'Authorization': `Token ${categoryId==2?process.env.DELHIVERY_500GM_SURFACE_KEY:process.env.DELHIVERY_10KG_SURFACE_KEY}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          });
          const data = await response.json();
          const statusData = data.ShipmentData[0].Shipment;
          const status = statusData.Status.Status
          await connection.execute('UPDATE SHIPMENT_REPORTS set status = ? WHERE ref_id = ?', [status, ref_id]);
          return {
            status:200, data : statusData , success : true
          };
      } else if ( serviceId == 2) {
        const loginPayload = {
          grant_type: "client_credentials",
          client_id: process.env.MOVIN_CLIENT_ID,
          client_secret: process.env.MOVIN_CLIENT_SECRET,
          Scope: `${process.env.MOVIN_SERVER_ID}/.default`,
        };
        const formBody = Object.entries(loginPayload).map(
            ([key, value]) =>
            encodeURIComponent(key) + "=" + encodeURIComponent(value)
        ).join("&");
        const login = await fetch(`https://login.microsoftonline.com/${process.env.MOVIN_TENANT_ID}/oauth2/v2.0/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body : formBody
        })
        const loginRes = await login.json()
        const movinToken = loginRes.access_token
        const response4 = await fetch(`https://apim.iristransport.co.in/rest/v2/order/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${movinToken}`,
              'Ocp-Apim-Subscription-Key' : process.env.MOVIN_SUBSCRIPTION_KEY
          },
          body: JSON.stringify({"tracking_numbers": [awb]}),
        });
        const data4 = await response4.json();
        if (data4.data[awb] != "Tracking number is not valid.") {
          const ResultStatus = [];
          for (const [key, value] of Object.entries(data4.data[awb])) {
            if (key.startsWith(awb)) {
              for (let i = 0; i < value.length; i++){
                ResultStatus.push(data4.data[awb][key][i])
              }
            }
          }
          return {
            status:200, data: ResultStatus, success: true, id : 3
          };
        }
      }
      





  }  finally { 
    connection.end();
  }
};





// const response = await fetch(`http://admin.flightgo.in/api/tracking_api/get_tracking_data?api_company_id=24&customer_code=1179&tracking_no=${ref_id}`, {
        //     headers: {
        //       'Accept': 'application/json',
        //       'Content-Type': 'application/json',
        //     },
        //   });
        //   const data = await response.json();
        //   const status = data.ShipmentData[0].Status.Status;
        //   await connection.execute('UPDATE SHIPMENT_REPORTS set status = ? WHERE ref_id = ?', [status, ref_id]);
        //   const [rows] = await connection.execute('SELECT * FROM SHIPMENT_REPORTS r JOIN SHIPMENTS s ON r.ord_id=s.ord_id WHERE r.ref_id = ?', [ref_id])
        //   return {
        //     statusCode: 200,
        //     body: JSON.stringify({ data : rows[0] , success : true }),
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Access-Control-Allow-Origin': '*', // Allow all origins (CORS)
                
        //       },
        //   };