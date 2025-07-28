const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const SECRET_KEY = process.env.JWT_SECRET;

const getMerchantDiscounts = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        let uid = null;
        if (verified.admin){
            uid = req?.params?.uid;
            if (!uid) {
                return res.status(400).json({
                    status: 400, message: 'Invalid User ID'
                });
            }
        } else {
            uid = verified.id;
        }
        const [discounts] = await db.query("SELECT s.service_id AS service_id, s.service_name AS service_name, ud.discount AS discount_percentage FROM USER_DISCOUNTS ud JOIN SERVICES s ON ud.service_id = s.service_id WHERE ud.uid = ?",[uid]);
        return res.status(200).json({
            status: 200, success: true, discounts: discounts
        });
    } catch (err) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const addMerchantDiscount = async (req, res) => {
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
        const {uid, service_id, discount } = req.body;
        await db.query("INSERT INTO USER_DISCOUNTS (uid, service_id, discount) VALUES (?,?,?)", [uid, service_id, discount]);
        return res.status(200).json({
            status: 200, success: true, message: 'Discount added successfully'
        });
    } catch (err) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const updateMerchantDiscount = async (req, res) => {
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
        const { uid, service_id, discount } = req.body;
        await db.query("UPDATE USER_DISCOUNTS SET discount =? WHERE uid =? AND service_id =?", [discount, uid, service_id]);
        return res.status(200).json({
            status: 200, success: true, message: 'Discount updated successfully'
        });
    } catch (err) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const deleteMerchantDiscount = async (req, res) => {
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
        const { uid, service_id } = req.body;
        await db.query("DELETE FROM USER_DISCOUNTS WHERE uid =? AND service_id =?", [uid, service_id]);
        return res.status(200).json({
            status: 200, success: true, message: 'Discount deleted successfully'
        });
    } catch (err) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

module.exports = {
    getMerchantDiscounts,
    addMerchantDiscount,
    updateMerchantDiscount,
    deleteMerchantDiscount
};