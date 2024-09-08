// netlify/functions/authenticate.js
const axios = require('axios');
require('dotenv').config();

exports.handler = async (event, context) => {
  const { waybill, act, date } = event.body;

  try {
    const req = {
        waybill: waybill,
        act: act,
        action_data : {
            deferred_date : date
        }
    }
    const response = await fetch(`https://track.delhivery.com/api/p/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${process.env.DELHIVERY_10KG_SURFACE_KEY}`,
          'Content-Type' : 'application/json',
          'Accept' : 'application/json'
        },
        body : JSON.stringify(req)
      }).then(response => response.json());
  
      return {
        status:200, data : response
      };
  } catch (error) {
    return {
      status:500, message: error.message , success: false 
    };
  }
};
