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

const activateMerchant = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return {
            status: 401, message: "Access Denied"
        };
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        if (!admin) {
            return res.status(401).json({
                status: 401, message: 'Access Denied'
            });
        }
        const { uid } = req.body;

        if (!uid) {
            return res.status(400).json({
                status: 400, message: 'uid is required'
            });
        }

        try {
            await db.query('UPDATE USERS set isActive=1 where uid = ?', [uid]);
            const [users] = await db.query("SELECT * FROM USERS WHERE uid = ?", [uid]);
            const { email, fullName } = users[0];
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Your account has been activated',
                text: `Dear ${fullName}, \nYour account has been re-activated.\n\nRegards,\nJupiter Xpress`
            };
            await transporter.sendMail(mailOptions);
            return res.status(200).json({
                status: 200, success: true, message: 'Account has been activated successfully'
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, error: error.message
            });
        }
    } catch (e) {
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

const submitVerifyRequest = async (req, res) => {
    const token = req.headers.Authorization;
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


module.exports = { createIncompleteVerifyRequest, activateMerchant, submitKYC, submitVerifyRequest }