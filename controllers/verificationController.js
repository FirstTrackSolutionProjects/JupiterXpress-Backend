const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { transporter } = require('../utils/email');

const SECRET_KEY = process.env.JWT_SECRET;

const createIncompleteVerifyRequest = async (req, res) => {
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
            if (!address || !state || !city || !pin || !aadhar || !pan || !gst || !msme || !bank || !ifsc || !account || !cin) {
                return res.status(400).json({
                    status: 400, message: 'All fields are required'
                });
            }
            try {
                const [requests] = await db.query('SELECT * FROM MERCHANT_VERIFICATION WHERE uid = ? AND status = "pending"', [id]);
                if (requests.length) {
                    return {
                        status: 400, message: 'You already have a pending verification request'
                    };
                }
                await db.query('INSERT INTO MERCHANT_VERIFICATION (uid, address, city, state, pin ,aadhar_number, pan_number, gst, cin, accountNumber, ifsc, bank, msme, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, address, city, state, pin, aadhar, pan, gst, cin, account, ifsc, bank, msme, "incomplete"]);
                const [users] = await db.query('SELECT * FROM USERS WHERE uid = ?', [id]);
                const email = users[0].email;
                const name = users[0].fullName;
                let mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'Verification Request is Incomplete',
                    text: `Dear ${name}, \n Your Request for verification of account on Jupiter Xpress is incomplete. Please upload your documents to finish the verification request.  \n\nRegards, \nJupiter Xpress`,

                };
                let mailOptions2 = {
                    from: process.env.EMAIL_USER,
                    to: `${process.env.VERIFY_EMAIL},${process.env.EMAIL_USER}`,
                    subject: 'Incomplete merchant Verification Request Received',
                    text: `Dear Owner, \n${name} has submitted a incomplete verification request for verification of account on Jupiter Xpress.`,

                };
                await transporter.sendMail(mailOptions);
                await transporter.sendMail(mailOptions2);
                return res.status(200).json({
                    status: 200, message: 'Details Submitted'
                });
            } catch (error) {
                return res.status(500).json({
                    status: 500, message: error.message, error: error.message
                });
            }

        } catch (err) {
            return res.status(500).json({
                status: 500, message: 'Something went wrong'
            });
        }
    } catch (err) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const submitVerifyRequest = async (req, res) => {
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
                "SELECT * FROM MERCHANT_VERIFICATION WHERE status='incomplete' AND uid = ?",
                [id]
            );
            if (req.length > 0) {
                await db.query(
                    "UPDATE MERCHANT_VERIFICATION set status='pending' WHERE status='incomplete' AND uid = ?",
                    [id]
                );
                return res.status(200).json({
                    status: 200,
                    success: true,
                    message: "Verification Request Submitted Successfully",
                });
            } else {
                return res.status(400).json({
                    status: 400,
                    success: true,
                    message: "You already have a pending Verification Request",
                });
            }

        } catch (err) {
            return res.status(500).json({
                status: 500,
                message: "Something went wrong",
            });
        }
    } catch (err) {
        return res.status(400).json({
            status: 400,
            message: "Invalid Token",
        });
    }
}

const getVerificationDocumentStatus = async (req, res) => {
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
            const [req] = await db.query("SELECT * FROM MERCHANT_VERIFICATION WHERE status='incomplete' AND uid = ?", [id]);
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
        })
    }
}

const getPendingVerificationRequests = async (req, res) => {
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
            const [users] = await db.query("SELECT * FROM USERS u INNER JOIN MERCHANT_VERIFICATION mv ON u.uid = mv.uid WHERE u.isVerified = 0 AND u.isAdmin = 0 AND mv.status='pending'");
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

const getIncompleteVerification = async (req, res) => {
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
            const [req] = await db.query("SELECT * FROM MERCHANT_VERIFICATION WHERE status='incomplete' AND uid = ?", [id]);
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

module.exports = {
    createIncompleteVerifyRequest,
    submitVerifyRequest,
    getVerificationDocumentStatus,
    getPendingVerificationRequests,
    getIncompleteVerification
}