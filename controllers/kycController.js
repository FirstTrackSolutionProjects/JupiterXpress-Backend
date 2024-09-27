const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { transporter } = require('../utils/email');

const SECRET_KEY = process.env.JWT_SECRET;

const getKYCDocumentStatus = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        try {
            const [req] = await db.query("SELECT * FROM KYC_UPDATE_REQUEST WHERE status='INCOMPLETE' AND uid = ?", [id]);
            return res.status(200).json({
                status: 200, success: true, message: req[0]
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

const submitKYC = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401,
            message: "Access Denied",
        });
    }

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        try {
            const [req] = await db.query(
                "SELECT * FROM KYC_UPDATE_REQUEST WHERE status='INCOMPLETE' AND uid = ?",
                [id]
            );
            if (req.length > 0) {
                await db.query(
                    "UPDATE KYC_UPDATE_REQUEST set status='PENDING' WHERE status='INCOMPLETE' AND uid = ?",
                    [id]
                );
                return res.status(200).json({
                    status: 200,
                    success: true,
                    message: "KYC Request Submitted Successfully",
                });
            } else {
                return res.status(400).json({
                    status: 400,
                    success: true,
                    message: "You already have a pending KYC Request",
                });
            }
        } catch (error) {
            return res.status(500).json({
                status: 500,
                message: error.message,
                error: error.message,
            });
        }

    } catch (err) {
        return res.status(400).json({
            status: 400,
            message: "Invalid Token",
        });
    }
}

const getIncompleteKYC = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;

        try {
            const [req] = await db.query("SELECT * FROM KYC_UPDATE_REQUEST WHERE status='INCOMPLETE' AND uid = ?", [id]);
            if (req.length > 0) {
                return res.status(200).json({
                    status: 200, success: true, message: req[0]
                });
            }
            else {
                return res.status(200).json({
                    status: 200, success: false
                });
            }
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

const getAllPendingKYCRequests = async (req, res) => {
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
            const [users] = await db.query("SELECT * FROM USERS u INNER JOIN KYC_UPDATE_REQUEST r ON u.uid = r.uid WHERE u.isAdmin = 0 AND r.status='PENDING'");
            return res.status(200).json({
                status: 200, success: true, message: users
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

const submitIncompleteKYC = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;

        const {
            address,
            state,
            city,
            pin,
            aadhar,
            pan,
            gst,
            msme,
            bank,
            ifsc,
            account,
            cin
        } = req.body;

        try {
            const [requests] = await db.query('SELECT * FROM KYC_UPDATE_REQUEST WHERE uid = ? AND status = "PENDING"', [id]);
            if (requests.length) {
                return res.status(400).json({
                    status: 400, message: 'You already have a pending KYC request'
                });
            }
            const [insertRequest] = await db.query('INSERT INTO KYC_UPDATE_REQUEST (uid, address, city, state, pin ,aadhar_number, pan_number, gst, cin, accountNumber, ifsc, bank, msme) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, address, city, state, pin, aadhar, pan, gst, cin, account, ifsc, bank, msme]);
            const reqId = insertRequest.insertId;
            const [users] = await db.query('SELECT * FROM USERS WHERE uid = ?', [id]);
            const email = users[0].email;
            const name = users[0].fullName;
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'KYC Update Request is Incomplete',
                text: `Dear ${name}, \n Your Request for KYC update of account on Jupiter Xpress is incomplete. Please upload your documents to finish the KYC update request.  \n\nRegards, \nJupiter Xpress`,

            };
            await transporter.sendMail(mailOptions);
            return res.status(200).json({
                status: 200, message: 'Details Submitted', reqId: reqId
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

module.exports = {
    getKYCDocumentStatus,
    submitKYC,
    getIncompleteKYC,
    getAllPendingKYCRequests,
    submitIncompleteKYC
}