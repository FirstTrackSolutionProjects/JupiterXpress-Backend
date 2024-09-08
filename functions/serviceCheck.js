// netlify/functions/authenticate.js
const axios = require('axios');
require('dotenv').config();

exports.handler = async (event, context) => {

  const { code } = event.body;
  if (!code) {
    return {
      status:400, message: 'Pincode required'
    };
  }
  try {
    const response = await axios.get(`https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${code}`, {
        headers: {
          'Authorization': `Token ${process.env.DELHIVERY_10KG_SURFACE_KEY}`,
        },
      });
  
      return {
        status:200, data : response.data
      };
  } catch (error) {
    return {
      status:500, message: error.message , success: false 
    };
  }
};
