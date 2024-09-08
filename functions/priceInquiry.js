const nodemailer = require("nodemailer");
require("dotenv").config();
let transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.handler = async (event) => {
  const {originCountry,
    origin,
    destCountry,
    dest,
    weight,
    payMode,
    length,
    breadth,
    height,
    name,
    phone,
    email, } = event.body;

  try {
    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: `${process.env.EMAIL_USER},${process.env.CONTACT_EMAIL}`,
      subject: "Inquiry : International Pricing",
      text: `Dear Owner,\nA merchant has submitted a inquiry for the International Pricing.\nHere are the following details,\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nOrigin Country: ${originCountry}\nOrigin Pin : ${origin}\nDestination Country: ${destCountry}\nDestination Pin : ${dest}\nPayment Mode : ${payMode}\nWeight : ${weight}\nLength : ${length}\nBreadth : ${breadth}\nHeight : ${height}\n\nRegards,\nJupiter Xpress`,
    };
    await transporter.sendMail(mailOptions);
    return {
      status:200, success: true, message: "Request Submitted Succesfully" 
    };
  } catch (error) {
    return {
      status:500, message: "Something went wrong, please try again", error: error.message 
    };
  }
};
