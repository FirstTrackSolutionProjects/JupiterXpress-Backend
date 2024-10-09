const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const SECRET_KEY = process.env.JWT_SECRET

const getContactRequests = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        if (!admin) {
            return res.status(400).json({
                status: 400, message: 'Not an admin'
            });
        }
        try {
            const [data] = await db.query('SELECT * FROM CONTACT_SUBMISSIONS');
            return res.status(200).json({
                status: 200, success: true, data: data
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, message: error.message, error: error.message
            });
        }
    } catch (err) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const submitContactRequest = async (req, res) => {
    try {
        const { name, email, mobile, message, subject } = req.body;
        if (!name || !email || !mobile || !message || !subject) {
            return res.status(400).json({
                status: 400, message: 'All fields are required'
            });
        }

        try {
            await db.query('INSERT INTO CONTACT_SUBMISSIONS (name, email ,phone, message, subject, status) VALUES (?, ?, ? , ?, ?, ?)', [name, email, mobile, message, subject, "open"]);
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: `${process.env.CONTACT_EMAIL},${process.env.EMAIL_USER}`,
                subject: `Contact Submission : ${subject}`,
                text: `Name :  ${name}\nEmail : ${email}\nMobile : ${mobile} \n\n${message} `
            };
            await transporter.sendMail(mailOptions);
            return res.status(200).json({
                status: 200, message: 'Contact Request Sent Successfully'
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, message: error.message, error: error.message
            });
        }

    } catch (err) {
        return res.status(400).json({
            status: 400, message: 'Something went wrong'
        });
    }
}

module.exports = { getContactRequests, submitContactRequest }