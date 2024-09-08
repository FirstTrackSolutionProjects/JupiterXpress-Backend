const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

exports.handler = async (event) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const { awb } = event.body;
    const response1 = await fetch(`https://track.delhivery.com/api/v1/packages/json/?waybill=${awb}`, {
      headers: {
        'Authorization': `Token ${process.env.DELHIVERY_500GM_SURFACE_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const data1 = await response1.json();

    if (data1.ShipmentData) {
      return {
        status:200, data: data1, success: true, id : 1
      };
    }

    const response2 = await fetch(`https://track.delhivery.com/api/v1/packages/json/?waybill=${awb}`, {
      headers: {
        'Authorization': `Token ${process.env.DELHIVERY_10KG_SURFACE_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const data2 = await response2.json();

    if (data2.ShipmentData) {
      return {
        status:200, data: data2, success: true, id : 1 
      };
    }
    try {
      const response3 = await fetch(`http://admin.flightgo.in/api/tracking_api/get_tracking_data?api_company_id=24&customer_code=1179&tracking_no=${awb}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      const data3 = await response3.json();
      if (!data3[0].errors) {
        return {
          status:200, data: data3[0], success: true, id : 2 
        };
      }
    } catch (err) {
      
    }
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
    return {
      status:404, message: "Not Found"
    };
    
    
  } catch {
    return {
      status:500, message: "Internal Server Error", success: false
    };
  }  finally { 
    await connection.end();
  }
};
