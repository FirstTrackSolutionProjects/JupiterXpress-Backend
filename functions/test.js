// const jwt = require('jsonwebtoken');
// const SECRET_KEY = process.env.JWT_SECRET;

exports.handler = async (event) => {

  const body = event.body
  const email = body.email
  try {

      return {
        status:200
      };
  } catch (error) {
    return {
      status:500, message: 'Error logging in', error: error.message
    }
  }
};
