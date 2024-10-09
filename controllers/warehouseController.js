const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const SECRET_KEY = process.env.JWT_SECRET;

const getAllWarehouses = async (req, res) => {
    const token = req.headers.authorization;
    const verified = jwt.verify(token, SECRET_KEY);
    const admin = verified.admin;
    if (!admin) {
        return res.status(400).json({
            status: 400, message: 'Access Denied'
        });
    }
    try {

        const [rows] = await db.query('SELECT * FROM WAREHOUSES');
        return res.status(200).json({
            status: 200, rows
        });

    } catch (error) {
        return res.status(400).json({
            status: 400, message: error.message, success: false
        });
    }
}

const getWarehouses = async (req, res) => {
    const token = req.headers.authorization;
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id;
    if (!id) {
        return res.status(400).json({
            status: 400, message: 'Access Denied'
        });
    }
    try {
        const [rows] = await db.query('SELECT * FROM WAREHOUSES WHERE uid = ?', [id]);
        return res.status(200).json({
            status: 200, rows
        });

    } catch (error) {
        return res.status(500).json({
            status: 500, message: error.message, success: false
        });
    }
}

const createWarehouse = async (req, res) => {
    const {
        name,
        email,
        phone,
        address,
        city,
        state,
        country,
        pin
    } = req.body
    const token = req.headers.authorization
    try {
        const verified = jwt.verify(token, SECRET_KEY)
        const id = verified.id

        const transaction = await db.beginTransaction();
        await transaction.execute('INSERT INTO WAREHOUSES (uid, warehouseName, address, phone, pin) VALUES (?,?,?,?,?)', [id, name, address, phone, pin]);
        const delhivery_500 = await fetch(`https://track.delhivery.com/api/backend/clientwarehouse/create/`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${process.env.DELHIVERY_500GM_SURFACE_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, email, phone, address, city, state, country, pin, return_address: address, return_pin: pin, return_city: city, return_state: state, return_country: country })
        });
        const delhivery_10 = await fetch(`https://track.delhivery.com/api/backend/clientwarehouse/create/`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${process.env.DELHIVERY_10KG_SURFACE_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, email, phone, address, city, state, country, pin, return_address: address, return_pin: pin, return_city: city, return_state: state, return_country: country })
        });
        //   const response2 = await fetch(`https://track.delhivery.com/api/backend/clientwarehouse/create/`, {
        //     method: 'POST',
        //     headers: {
        //     'Authorization': `Token ${process.env.DELHIVERY_10KG_SURFACE_KEY}`,
        //     'Content-Type': 'application/json',
        //     'Accept': 'application/json'
        //     },
        //     body: JSON.stringify({name, email, phone, address, city, state, country, pin, return_address:address, return_pin:pin, return_city:city, return_state:state, return_country:country})
        // });
        const data = await delhivery_500.json();
        const data2 = await delhivery_10.json();
        if (!data.success || !data2.success) {
            return res.status(400).json({
                status: 400, success: false, message: data.error + data2.error
            });
        }
        try {

            await db.commit(transaction);

        } catch (error) {
            await db.rollback(transaction);
            return res.status(500).json({
                status: 500, message: error.message, success: false
            });
        }
        return res.status(200).json({
            status: 200, success: true, message: data.data.message
        });
    } catch (error) {
        return res.status(500).json({
            status: 500, success: false, message: error.message
        });
    }
}

const updateWarehouse = async (req, res) => {
    const {
        name,
        phone,
        address,
        pin
    } = req.body
    try {
        const response = await fetch(`https://track.delhivery.com/api/backend/clientwarehouse/edit/`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${process.env.DELHIVERY_500GM_SURFACE_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, phone, address, pin })
        });
        const response2 = await fetch(`https://track.delhivery.com/api/backend/clientwarehouse/edit/`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${process.env.DELHIVERY_10KG_SURFACE_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, phone, address, pin })
        });
        const data = await response.json();
        const data2 = await response2.json();
        if (!data.success || !data2.success) {
            return res.status(400).json({
                status: 400, success: false, message: data.error + data2.error
            });
        }
        try {

            await db.query('UPDATE WAREHOUSES set address = ?, phone = ?, pin = ? WHERE warehouseName = ?', [address, phone, pin, name]);

        } catch (error) {
            return res.status(500).json({
                status: 500, message: error.message, success: false
            });
        }
        return res.status(200).json({
            status: 200, success: true, message: data.data.message
        });
    } catch (error) {
        return res.status(500).json({
            status: 500, success: false, message: error
        });
    }
}

module.exports = { getAllWarehouses, getWarehouses, createWarehouse, updateWarehouse };