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

const updateKYCDocumentStatus = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const { name, key } = req.body;
        if (!name || !key) {
            return res.status(400).json({
                status: 400,
                message: 'Missing required fields'
            });
        }
        try {
            await db.query(`UPDATE KYC_UPDATE_REQUEST set ${name} = ? WHERE status='INCOMPLETE' AND uid = ?`, [key, id]);
            return res.status(200).json({
                status: 200, success: true
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, message: error.message, error: error.message
            });
        }
    } catch (err) {
        return res.status(400).json({
            status: 400, message: 'Unauthorized'
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

const rejectKYCRequest = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }
    const { uid, reqId } = req.body;
    if (!uid || !reqId) {
        return res.status(400).json({
            status: 400, message: 'Missing uid or reqId'
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        const id = verified.id;
        if (!admin) {
            return res.status(400).json({
                status: 400, message: 'Not an admin'
            });
        }

        try {
            await db.query("UPDATE KYC_UPDATE_REQUEST SET status='REJECTED', actionBy=? WHERE reqId = ?", [id, reqId]);
            const [users] = await db.query("SELECT * FROM USERS WHERE uid = ?", [uid]);
            const { email, fullName } = users[0];
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'KYC verification is rejected',
                text: `Dear ${fullName}, \nWe were not able to verify your documents due to some reason. Please try again.`
            };
            await transporter.sendMail(mailOptions);
            return res.status(200).json({
                status: 200, success: true, message: 'KYC verification rejected'
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

const acceptKYCRequest = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }
    const { uid, kycId } = req.body;
    if (!uid || !kycId) {
        return res.status(400).json({
            status: 400, message: 'Missing uid or kycId'
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        const id = verified.id;
        if (!admin) {
            return res.status(400).json({
                status: 400, message: 'Not an admin'
            });
        }
        try {

            const [requests] = await db.query("SELECT * FROM KYC_UPDATE_REQUEST WHERE kycId = ? ", [kycId]);
            const userData = requests[0];
            await db.query("UPDATE USER_DATA SET address = ?, state = ?, city =?, pin =?, aadhar_number=?, pan_number=?, gst=?, cin =?,msme=?, accountNumber=?, ifsc=?, bank=?, aadhar_doc=?, pan_doc=?, selfie_doc=?, gst_doc=?, cancelledCheque=? WHERE uid = ? ", [userData.address, userData.state, userData.city, userData.pin, userData.aadhar_number, userData.pan_number, userData.gst, userData.cin, userData.msme, userData.accountNumber, userData.ifsc, userData.bank, userData.aadharDoc, userData.panDoc, userData.selfieDoc, userData.gstDoc, userData.cancelledCheque, uid])
            await db.query("UPDATE KYC_UPDATE_REQUEST SET status='ACCEPTED', actionBy=? WHERE kycId = ? ", [id, kycId]);
            const [users] = await db.query("SELECT * FROM USERS WHERE uid = ?", [uid]);
            const { email, fullName } = users[0];
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'KYC has been verified',
                text: `Dear ${fullName}, \nYour account KYC has been verified and your profile is updated according to it. Login now and take the experience of our minimal documentation domestic and international shipments`
            };
            await transporter.sendMail(mailOptions);
            return res.status(200).json({
                status: 200, success: true, message: 'KYC successfully verified'
            })
        } catch (error) {
            return res.status(500).json({
                status: 500, message: error.message, error: error.message
            })
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
    submitIncompleteKYC,
    rejectKYCRequest,
    updateKYCDocumentStatus,
    acceptKYCRequest
}