const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const IndianStateInfo = {
  "Andaman & Nicobar" :{
      "id": 4023,
      "name": "Andaman and Nicobar Islands",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "AN",
      "type": "Union territory",
      "latitude": "11.74008670",
      "longitude": "92.65864010"
  },
   "Andhra Pradesh" : {
      "id": 4017,
      "name": "Andhra Pradesh",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "AP",
      "type": "state",
      "latitude": "15.91289980",
      "longitude": "79.73998750"
  },
  "Arunachal Pradesh": {
      "id": 4024,
      "name": "Arunachal Pradesh",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "AR",
      "type": "state",
      "latitude": "28.21799940",
      "longitude": "94.72775280"
  },
  "Assam" : {
      "id": 4027,
      "name": "Assam",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "AS",
      "type": "state",
      "latitude": "26.20060430",
      "longitude": "92.93757390"
  },
  "Bihar" : {
      "id": 4037,
      "name": "Bihar",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "BR",
      "type": "state",
      "latitude": "25.09607420",
      "longitude": "85.31311940"
  },
  "Chandigarh" : {
      "id": 4031,
      "name": "Chandigarh",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "CH",
      "type": "Union territory",
      "latitude": "30.73331480",
      "longitude": "76.77941790"
  },
  "Chhattisgarh" : {
      "id": 4040,
      "name": "Chhattisgarh",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "CT",
      "type": "state",
      "latitude": "21.27865670",
      "longitude": "81.86614420"
  },
  "Dadra & Nagar Haveli" : {
      "id": 4033,
      "name": "Dadra and Nagar Haveli and Daman and Diu",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "DH",
      "type": "Union territory",
      "latitude": "20.39737360",
      "longitude": "72.83279910"
  },
  "Daman & Diu" : {
      "id": 4033,
      "name": "Dadra and Nagar Haveli and Daman and Diu",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "DH",
      "type": "Union territory",
      "latitude": "20.39737360",
      "longitude": "72.83279910"
  },
  "Delhi" : {
      "id": 4021,
      "name": "Delhi",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "DL",
      "type": "Union territory",
      "latitude": "28.70405920",
      "longitude": "77.10249020"
  },
  "Goa" : {
      "id": 4009,
      "name": "Goa",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "GA",
      "type": "state",
      "latitude": "15.29932650",
      "longitude": "74.12399600"
  },
  "Gujarat" : {
      "id": 4030,
      "name": "Gujarat",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "GJ",
      "type": "state",
      "latitude": "22.25865200",
      "longitude": "71.19238050"
  },
  "Haryana" : {
      "id": 4007,
      "name": "Haryana",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "HR",
      "type": "state",
      "latitude": "29.05877570",
      "longitude": "76.08560100"
  },
  "Himachal Pradesh" : {
      "id": 4020,
      "name": "Himachal Pradesh",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "HP",
      "type": "state",
      "latitude": "31.10482940",
      "longitude": "77.17339010"
  },
  "Jammu & Kashmir" : {
      "id": 4029,
      "name": "Jammu and Kashmir",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "JK",
      "type": "Union territory",
      "latitude": "33.27783900",
      "longitude": "75.34121790"
  },
  "Jharkhand" : {
      "id": 4025,
      "name": "Jharkhand",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "JH",
      "type": "state",
      "latitude": "23.61018080",
      "longitude": "85.27993540"
  },
  "Karnataka" : {
      "id": 4026,
      "name": "Karnataka",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "KA",
      "type": "state",
      "latitude": "15.31727750",
      "longitude": "75.71388840"
  },
  "Kerala" : {
      "id": 4028,
      "name": "Kerala",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "KL",
      "type": "state",
      "latitude": "10.85051590",
      "longitude": "76.27108330"
  },
  "Ladakh" : {
      "id": 4852,
      "name": "Ladakh",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "LA",
      "type": "Union territory",
      "latitude": "34.22684750",
      "longitude": "77.56194190"
  },
  "Lakshadweep" : {
      "id": 4019,
      "name": "Lakshadweep",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "LD",
      "type": "Union territory",
      "latitude": "10.32802650",
      "longitude": "72.78463360"
  },
  "Madhya Pradesh" : {
      "id": 4039,
      "name": "Madhya Pradesh",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "MP",
      "type": "state",
      "latitude": "22.97342290",
      "longitude": "78.65689420"
  },
  "Maharashtra" : {
      "id": 4008,
      "name": "Maharashtra",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "MH",
      "type": "state",
      "latitude": "19.75147980",
      "longitude": "75.71388840"
  },
  "Manipur" : {
      "id": 4010,
      "name": "Manipur",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "MN",
      "type": "state",
      "latitude": "24.66371730",
      "longitude": "93.90626880"
  },
  "Meghalaya" : {
      "id": 4006,
      "name": "Meghalaya",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "ML",
      "type": "state",
      "latitude": "25.46703080",
      "longitude": "91.36621600"
  },
  "Mizoram" : {
      "id": 4036,
      "name": "Mizoram",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "MZ",
      "type": "state",
      "latitude": "23.16454300",
      "longitude": "92.93757390"
  },
  "Nagaland" : {
      "id": 4018,
      "name": "Nagaland",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "NL",
      "type": "state",
      "latitude": "26.15843540",
      "longitude": "94.56244260"
  },
  "Odisha" : {
      "id": 4013,
      "name": "Odisha",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "OR",
      "type": "state",
      "latitude": "20.95166580",
      "longitude": "85.09852360"
  },
  "Puducherry" : {
      "id": 4011,
      "name": "Puducherry",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "PY",
      "type": "Union territory",
      "latitude": "11.94159150",
      "longitude": "79.80831330"
  },
  "Punjab" : {
      "id": 4015,
      "name": "Punjab",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "PB",
      "type": "state",
      "latitude": "31.14713050",
      "longitude": "75.34121790"
  },
  "Rajasthan" : {
      "id": 4014,
      "name": "Rajasthan",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "RJ",
      "type": "state",
      "latitude": "27.02380360",
      "longitude": "74.21793260"
  },
  "Sikkim" : {
      "id": 4034,
      "name": "Sikkim",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "SK",
      "type": "state",
      "latitude": "27.53297180",
      "longitude": "88.51221780"
  },
  "Tamil Nadu" : {
      "id": 4035,
      "name": "Tamil Nadu",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "TN",
      "type": "state",
      "latitude": "11.12712250",
      "longitude": "78.65689420"
  },
  "Telangana" : {
      "id": 4012,
      "name": "Telangana",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "TG",
      "type": "state",
      "latitude": "18.11243720",
      "longitude": "79.01929970"
  },
  "Tripura" : {
      "id": 4038,
      "name": "Tripura",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "TR",
      "type": "state",
      "latitude": "23.94084820",
      "longitude": "91.98815270"
  },
  "Uttar Pradesh" : {
      "id": 4022,
      "name": "Uttar Pradesh",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "UP",
      "type": "state",
      "latitude": "26.84670880",
      "longitude": "80.94615920"
  },
  "Uttarakhand" : {
      "id": 4016,
      "name": "Uttarakhand",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "UK",
      "type": "state",
      "latitude": "30.06675300",
      "longitude": "79.01929970"
  },
  "West Bengal" : {
      "id": 4853,
      "name": "West Bengal",
      "country_id": 101,
      "country_code": "IN",
      "country_name": "India",
      "state_code": "WB",
      "type": "state",
      "latitude": "22.98675690",
      "longitude": "87.85497550"
  }
}
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};
const SECRET_KEY = process.env.JWT_SECRET;

exports.handler = async (event) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const token = event.headers.Authorization;
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id;
    let {wid, pickTime, pickDate, packages, serviceId} = event.body;
    const [warehouses] = await connection.execute('SELECT * FROM WAREHOUSES WHERE uid = ? AND wid = ?', [id, wid]);
    const [users] = await connection.execute('SELECT * FROM USERS WHERE uid = ?',[id])
    const user = users[0]
    const warehouse = warehouses[0]
    // const [orders] = await connection.execute('SELECT * FROM ORDERS WHERE ord_id = ? ', [order]);
   
    if (serviceId[0] == 1){
      const schedule = await fetch(`https://track.delhivery.com/fm/request/new/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Token ${serviceId[1]==1?process.env.DELHIVERY_10KG_SURFACE_KEY : process.env.DELHIVERY_500GM_SURFACE_KEY}`
        },
        body : JSON.stringify({pickup_location: warehouse.warehouseName, pickup_time : pickTime, pickup_date : pickDate, expected_package_count	: packages})
      })
      const scheduleData = await schedule.json()
      if (scheduleData.incoming_center_name){
        return {
          status:200, schedule : "Pickup request sent successfully", success : true
        };
      }
      else if (scheduleData.prepaid){
        return {
          status:200,schedule : "Pickup request failed due to low balance of owner", success : true
        };
      }
      else if (scheduleData.pr_exist){
        return {
          status:200, schedule : "This time slot is already booked", success : true
        };
      }
      else {
        return {
          status:200, schedule : "Please enter a valid date and time in future", success : false
        };
      }
      


    } else if (serviceId[0] == 2) {
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
      const token = loginRes.access_token
      const pickupLocReq = await fetch(`http://www.postalpincode.in/api/pincode/${warehouse.pin}`)
      const pickupLocRes = await pickupLocReq.json()
      const pickupCity = pickupLocRes.PostOffice[0].District
      const pickupState = IndianStateInfo[pickupLocRes.PostOffice[0].State]
      const schedulePayload  = {
          "account": process.env.MOVIN_ACCOUNT_NUMBER,
          "pickup_date":pickDate,
          "pickup_time_start": pickTime,
          "service_type": serviceId[1] == 1?"Standard Premium":"Express End of Day",
          "address_first_name": warehouse.warehouseName,
          "address_last_name": "",
          "address_email": "xpressjupiter@gmail.com",
          "address_phone": user.phone,
          "address_address_line1": warehouse.address,
          "address_address_line2": warehouse.address,
          "address_address_line3": warehouse.address,
          "address_zipcode": warehouse.pin,
          "address_city": pickupCity,
          "address_state": pickupState.state_code,
          "pickup_reason": "Parcel Pickup"
      }
      const schedule = await fetch(`https://apim.iristransport.co.in/rest/v2/pickup/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Ocp-Apim-Subscription-Key' : process.env.MOVIN_SUBSCRIPTION_KEY,
          'Authorization': `Bearer ${token}`
        },
        body : JSON.stringify(schedulePayload)
      }).then((response) => response.json())
      if (schedule.status == 200){
        return {
          status:200, schedule : "Pickup request sent successfully", success : true
        };
      }
      else if (schedule.response.errors.pickup_date){
        return {
          status:200, schedule : schedule.response.errors.pickup_date[0].error, success : false
        };
      }
      else if (schedule.response.errors.pickup_time_start_hour){
        return {
          status:200, schedule : schedule.response.errors.pickup_time_start_hour[0].error, success : false
        };
      }
      else if (schedule.response.errors.zipcode){
        return {
          status:200, schedule : schedule.response.errors.zipcode[0].error, success : false
        };
      }
      else if (schedule.response.errors.service_type){
        return {
          status:200, schedule : schedule.response.errors.service_type[0].error, success : false
        };
      }
      else {
        return {
          status:200, schedule : schedule, success : false
        };
      }
    }
    
  } catch (error) {
    return {
        status:500, schedule : error, success : false
      };
    
  }  finally {
    connection.end()
  }
};
