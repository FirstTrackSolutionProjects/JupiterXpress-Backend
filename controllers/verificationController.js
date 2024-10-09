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
            if (!address || !state || !city || !pin || !aadhar || !pan || !bank || !ifsc || !account) {
                return res.status(400).json({
                    status: 400, message: 'All fields are required'
                });
            }
            try {
                const [requests] = await db.query('SELECT * FROM MERCHANT_VERIFICATION WHERE uid = ? AND status = "pending"', [id]);
                if (requests.length) {
                    return res.status(400).json({
                        status: 400, message: 'You already have a pending verification request'
                    });
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

const updateVerificationDocumentStatus = async (req, res) => {
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
                status: 400, message: 'Both name and key are required'
            });
        }
        try {
            await db.query(`UPDATE MERCHANT_VERIFICATION set ${name} = ? WHERE status='incomplete' AND uid = ?`, [key, id]);
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
            status: 400, message: 'Invalid Token'
        });
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
            const [requests] = await db.query("SELECT * FROM MERCHANT_VERIFICATION WHERE status='incomplete' AND uid = ?", [id]);
            if (requests.length){
                return res.status(200).json({
                    status: 200, success: true, message: requests[0]
                });
            }
            return res.status(200).json({
                status: 200, success: false, message: 'No incomplete verification request found'
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

const rejectVerificationRequest = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }
    const { uid, reqId } = req.body;
    if (!uid || !reqId) {
        return res.status(400).json({
            status: 400, message: 'Missing required fields'
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
            await db.query("UPDATE MERCHANT_VERIFICATION SET status='rejected', actionBy=? WHERE reqId = ?", [id, reqId]);
            const [users] = await db.query("SELECT * FROM USERS WHERE uid = ?", [uid]);
            const { email, fullName } = users[0];
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Account verification is rejected',
                text: `Dear ${fullName}, \nWe were not able to verify your documents due to some reason. Please try again.`
            };
            await transporter.sendMail(mailOptions);
            return res.status(200).json({
                status: 200, success: true, message: 'Merchant verification rejected'
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

const acceptVerificationRequest = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }
    const { uid, reqId } = req.body;
    if (!uid || !reqId) {
        return res.status(400).json({
            status: 400, message: 'Missing required fields'
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
            const [requests] = await db.query("SELECT * FROM MERCHANT_VERIFICATION WHERE reqId = ? ", [reqId]);
            const userData = requests[0];
            await db.query("INSERT INTO USER_DATA (uid, address, state, city, pin, aadhar_number, pan_number, gst, cin ,msme, accountNumber, ifsc, bank, aadhar_doc, pan_doc, selfie_doc, gst_doc, cancelledCheque) VALUES (?, ? ,? ,?, ? ,? ,? ,? ,? , ? , ? ,? ,?, ?, ?, ?, ?, ?) ", [uid, userData.address, userData.state, userData.city, userData.pin, userData.aadhar_number, userData.pan_number, userData.gst, userData.cin, userData.msme, userData.accountNumber, userData.ifsc, userData.bank, userData.aadhar_doc, userData.pan_doc, userData.selfie_doc, userData.gst_doc, userData.cancelledCheque])
            await db.query("INSERT INTO WALLET (uid, balance) VALUES (?, ?)", [uid, 10]);
            await db.query("UPDATE USERS SET isVerified = 1 WHERE uid = ?", [uid]);
            await db.query("UPDATE MERCHANT_VERIFICATION SET status='accepted', actionBy=? WHERE reqId = ? ", [id, reqId]);
            const [users] = await db.query("SELECT * FROM USERS WHERE uid = ?", [uid]);
            const { email, fullName } = users[0];
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Account has been verified',
                text: `Dear ${fullName}, \nYour account has been verified on Jupiter Xpress. Login now and experience the fast delivery.`
            };
            await transporter.sendMail(mailOptions);
            return res.status(200).json({
                status: 200, success: true, message: 'Merchant successfully verified'
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
    getIncompleteVerification,
    rejectVerificationRequest,
    updateVerificationDocumentStatus,
    acceptVerificationRequest
}