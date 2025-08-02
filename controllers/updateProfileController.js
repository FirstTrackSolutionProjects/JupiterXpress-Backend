const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { transporter } = require('../utils/email');

const SECRET_KEY = process.env.JWT_SECRET;

const merchantUpdateProfileRequest = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        if (admin) {
            return res.status(400).json({
                status: 400, message: 'Only merchants can request profile update'
            });
        }
        const {
            req_id,
            full_name,
            business_name,
            phone,
            email,
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
            cin,
            aadhar_doc,
            pan_doc,
            gst_doc,
            cancelledCheque,
            selfie_doc
        } = req.body;

        if (!req_id || !full_name || !business_name){
            return res.status(400).json({
                status: 400, message: 'Req Id, Full Name and Business Name are required'
            });
        }

        
        await db.query(`INSERT INTO UPDATE_PROFILE_REQUEST 
                (reqId, 
                uid,
                fullName, 
                businessName, 
                phone, 
                aadharDoc, 
                panDoc, 
                gstDoc, 
                cancelledCheque, 
                selfieDoc,
                cin,
                gst,
                msme,
                accountNumber,
                ifsc,
                bank,
                address,
                state,
                city,
                pin,
                aadhar_number,
                pan_number) 
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    req_id,
                    verified.id,
                    full_name,
                    business_name,
                    phone,
                    aadhar_doc,
                    pan_doc,
                    gst_doc,
                    cancelledCheque,
                    selfie_doc,
                    cin,
                    gst,
                    msme,
                    account,
                    ifsc,
                    bank,
                    address,
                    state,
                    city,
                    pin,
                    aadhar,
                    pan
                ]);
                
                return res.status(200).json({
                    status: 200, success: true, message: 'Profile update request submitted successfully'
                });


    } catch {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const getPendingMerchantUpdateProfileRequest = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }
    try{
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        if (admin) {
            return res.status(400).json({
                status: 400, message: 'Only merchants are allowed to submit profile update requests'
            });
        }
        const uid = verified.id;
        try {
            const [requests] = await db.query("SELECT * FROM UPDATE_PROFILE_REQUEST WHERE status IS NULL AND uid=?",[uid]);
            if (!requests.length){
                return res.status(200).json({
                    status: 200, success: false, message: 'No pending requests'
                });
            }
            return res.status(200).json({
                status: 200, success: true, response: requests[0]
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, message: error.message, error: error.message
            });
        }
    } catch (error) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const getPendingMerchantUpdateProfileRequests = async (req, res) => {
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
            const [requests] = await db.query(`SELECT 
                                                 upr.*,
                                                 u.businessName as request_from
                                                FROM UPDATE_PROFILE_REQUEST upr 
                                                JOIN USERS u ON upr.uid = u.uid
                                                WHERE status IS NULL`);
            return res.status(200).json({
                status: 200, success: true, message: requests || []
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, message: error.message, error: error.message
            });
        }
    } catch (error) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const approveMerchantUpdateProfileRequest = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }
    try{
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        if (!admin) {
            return res.status(400).json({
                status: 400, message: 'Not an admin'
            });
        }
        const admin_uid = verified.id;
        const { req_id } = req.body;
        if (!req_id) {
            return res.status(400).json({
                status: 400, message: 'Req Id is required'
            });
        }
        try {
            const [request] = await db.query("SELECT * FROM UPDATE_PROFILE_REQUEST WHERE reqId=?",[req_id]);
            if (!request.length){
                return res.status(200).json({
                    status: 200, success: false, message: 'Request not found'
                });
            }
            const newData = request[0];
            const transaction = await db.beginTransaction();
            await transaction.query("UPDATE UPDATE_PROFILE_REQUEST SET status=true, actionBy=? WHERE reqId=?",[admin_uid,req_id]);
            await transaction.query(`UPDATE USERS 
                                        SET 
                                            fullName = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE fullName END,
                                            businessName = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE businessName END,
                                            phone = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE phone END
                                        WHERE uid = ?`,
                                    [
                                        newData.fullName, newData.fullName, newData.fullName,
                                        newData.businessName, newData.businessName, newData.businessName,
                                        newData.phone, newData.phone, newData.phone,
                                        newData.uid
                                    ])
            await transaction.query(
                `UPDATE USER_DATA SET
                    address = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE address END,
                    state = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE state END,
                    city = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE city END,
                    pin = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE pin END,
                    aadhar_number = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE aadhar_number END,
                    pan_number = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE pan_number END,
                    aadhar_doc = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE aadhar_doc END,
                    pan_doc = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE pan_doc END,
                    gst_doc = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE gst_doc END,
                    cancelledCheque = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE cancelledCheque END,
                    selfie_doc = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE selfie_doc END,
                    cin = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE cin END,
                    gst = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE gst END,
                    msme = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE msme END,
                    bank = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE bank END,
                    ifsc = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE ifsc END,
                    accountNumber = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE accountNumber END
                WHERE uid = ?`,
                [
                    newData.address, newData.address, newData.address,
                    newData.state, newData.state, newData.state,
                    newData.city, newData.city, newData.city,
                    newData.pin, newData.pin, newData.pin,
                    newData.aadhar_number, newData.aadhar_number, newData.aadhar_number,
                    newData.pan_number, newData.pan_number, newData.pan_number,
                    newData.aadharDoc, newData.aadharDoc, newData.aadharDoc,
                    newData.panDoc, newData.panDoc, newData.panDoc,
                    newData.gstDoc, newData.gstDoc, newData.gstDoc,
                    newData.cancelledCheque, newData.cancelledCheque, newData.cancelledCheque,
                    newData.selfieDoc, newData.selfieDoc, newData.selfieDoc,
                    newData.cin, newData.cin, newData.cin,
                    newData.gst, newData.gst, newData.gst,
                    newData.msme, newData.msme, newData.msme,
                    newData.bank, newData.bank, newData.bank,
                    newData.ifsc, newData.ifsc, newData.ifsc,
                    newData.accountNumber, newData.accountNumber, newData.accountNumber,
                    newData.uid
                ]
            );
            
            await db.commit(transaction);
            return res.status(200).json({
                status: 200, success: true, message: 'Request approved successfully'
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, message: error.message, error: error.message
            });
        }
    } catch (error) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const rejectMerchantUpdateProfileRequest = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }
    try{
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        if (!admin) {
            return res.status(400).json({
                status: 400, message: 'Not an admin'
            });
        }
        const admin_uid = verified.id;
        const { req_id } = req.body;
        if (!req_id) {
            return res.status(400).json({
                status: 400, message: 'Req Id is required'
            });
        }
        try {
            const [request] = await db.query("SELECT * FROM UPDATE_PROFILE_REQUEST WHERE reqId=?",[req_id]);
            if (!request.length){
                return res.status(200).json({
                    status: 200, success: false, message: 'Request not found'
                });
            }
            await db.query("UPDATE UPDATE_PROFILE_REQUEST SET status=false, actionBy=? WHERE reqId=?",[admin_uid,req_id]);
            return res.status(200).json({
                status: 200, success: true, message: 'Request rejected successfully'
            });
        } catch (error){
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
    merchantUpdateProfileRequest,
    getPendingMerchantUpdateProfileRequest,
    getPendingMerchantUpdateProfileRequests,
    approveMerchantUpdateProfileRequest,
    rejectMerchantUpdateProfileRequest
}