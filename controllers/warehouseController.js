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

const createWarehouseAsync = async (wid, name, phone, address, city, state, country, pin, verified) => {
    const isWarehouseAlreadyCreatedOnCurrentService = async (serviceId) => {
        const [checkStatus] = await db.query('SELECT * FROM SERVICES_WAREHOUSES_RELATION WHERE warehouse_id = ? AND service_id = ?', [wid, serviceId]);
        if (checkStatus.length) {
            return true;
        }
        return false;
    }
    const isServiceDisabled = async (serviceId) => {
        const [checkStatus] = await db.query('SELECT * FROM SERVICES_WITH_WAREHOUSES WHERE service_id =? AND is_active = false', [serviceId]);
        if (checkStatus.length) {
            return true;
        }
        return false;
    }
    const createWarehouseDelhivery500gm = async () => {
        const serviceId = 1;
        const warehouseAlreadyExists = await isWarehouseAlreadyCreatedOnCurrentService(serviceId);
        const isServiceNotActive = await isServiceDisabled(serviceId);
        if (warehouseAlreadyExists || isServiceNotActive)
            return {remarks: 'Warehouse already exists'};

        const createWarehouseRequest = await fetch(`https://track.delhivery.com/api/backend/clientwarehouse/create/`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${process.env.DELHIVERY_500GM_SURFACE_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, email : verified.email, phone, address, city, state, country, pin, return_address: address, return_pin: pin, return_city: city, return_state: state, return_country: country })
        })
        const createWarehouseResponse = await createWarehouseRequest.json();
        if (!createWarehouseResponse.success) {
            console.error(createWarehouseResponse.error);
            return {response : createWarehouseResponse}
        } else {
            await db.query("INSERT INTO SERVICES_WAREHOUSES_RELATION (warehouse_id, service_id) VALUES (?,?)", [wid, serviceId])
            return {success : true}
        }
    }
    const createWarehouseDelhivery10kg = async () => {
        const serviceId = 2;
        const warehouseAlreadyExists = await isWarehouseAlreadyCreatedOnCurrentService(serviceId);
        const isServiceNotActive = await isServiceDisabled(serviceId);
        if (warehouseAlreadyExists || isServiceNotActive)
            return {remarks: 'Warehouse already exists'};
        const createWarehouseRequest = await fetch(`https://track.delhivery.com/api/backend/clientwarehouse/create/`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${process.env.DELHIVERY_10KG_SURFACE_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, email : verified.email, phone, address, city, state, country, pin, return_address: address, return_pin: pin, return_city: city, return_state: state, return_country: country })
        });
        const createWarehouseResponse = await createWarehouseRequest.json();
        if (!createWarehouseResponse.success) {
            console.error(createWarehouseResponse.error);
            return {response : createWarehouseResponse}
        } else {
            await db.query("INSERT INTO SERVICES_WAREHOUSES_RELATION (warehouse_id, service_id) VALUES (?,?)", [wid, serviceId])
            return {success : true}
        }
    }

    const createWarehousePickrr20kg = async () => {
        const serviceId = 3;
        const warehouseAlreadyExists = await isWarehouseAlreadyCreatedOnCurrentService(serviceId);
        const isServiceNotActive = await isServiceDisabled(serviceId);
        if (warehouseAlreadyExists || isServiceNotActive)
            return {remarks: 'Warehouse already exists'};
        
        const shiprocketClientID = process.env.SHIPROCKET_CLIENT_ID
        const shipRocketLogin = await fetch('https://api-cargo.shiprocket.in/api/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: process.env.SHIPROCKET_REFRESH_TOKEN }),
        })
        const shiprocketLoginData = await shipRocketLogin.json()
        const shiprocketAccess = shiprocketLoginData.access
        const shipRocketCargo = await fetch(`https://api-cargo.shiprocket.in/api/warehouses/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${shiprocketAccess}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                client_id: shiprocketClientID,
                address: {
                    address_line_1: address,
                    address_line_2: address,
                    pincode: pin,
                    city: city,
                    state: state,
                    country: country
                },
                "warehouse_code": name.replace(/\s+/g, ''),
                "contact_person_name": verified.name,
                "contact_person_email": verified.email,
                "contact_person_contact_no": "1234567890"
            })
        });
        const data3 = await shipRocketCargo.json();
        if (data3.non_field_errors) {
            console.log(data3.non_field_errors)
            return {response : data3}
        } else {
            await db.query("INSERT INTO SERVICES_WAREHOUSES_RELATION (warehouse_id, service_id) VALUES (?,?)", [wid, serviceId]);
            return {success : true}
        }
    }
    const final = await Promise.all([
        createWarehouseDelhivery500gm(),
        createWarehouseDelhivery10kg(),
        createWarehousePickrr20kg()
    ])
    return final;
}
const checkWarehouseServicesStatus = async (wid) => {
    const [connectedServices] = await db.query('SELECT * FROM SERVICES_WAREHOUSES_RELATION where warehouse_id = ? ORDER BY service_id', [wid]);
    const [availableServices] = await db.query('SELECT * FROM SERVICES_WITH_WAREHOUSES where is_active = true ORDER BY service_id');
    const tempResult = {};
    for (let i = 0; i < availableServices.length; i++) {
        const service_id = availableServices[i].service_id;
        const temp = {
            service_id: availableServices[i].service_id,
            service_name: availableServices[i].service_name,
            warehouse_created: false
        }
        tempResult[service_id] = temp;
    }
    for (let i = 0; i < connectedServices.length; i++) {
        const service_id = connectedServices[i].service_id;
        tempResult[service_id].warehouse_created = true;
    }
    const result = [];
    for (const key in tempResult) {
        result.push(tempResult[key]);
    }
    return result;
}
const createWarehouse = async (req, res) => {
    const {
        name,
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
        const [warehouse] = await db.query('INSERT INTO WAREHOUSES (uid, warehouseName, address, phone, pin, state, city, country, just_created) VALUES (?,?,?,?,?,?,?,?,?)', [id, name, address, phone, pin, state, city, country, true]);
        const wid = warehouse.insertId;
        await createWarehouseAsync(wid, name, phone, address, city, state, country, pin, verified);
        const createWarehouseResult = await checkWarehouseServicesStatus(wid)
        return res.status(200).json({
            status: 200, success: true, response: createWarehouseResult
        });
    } catch (error) {
        return res.status(500).json({
            status: 500, success: false, message: error.message
        });
    }
}

const reAttemptWarehouseCreation = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, success: false, message: 'Unauthorized'
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY)
        const id = verified.id
        const { wid } = req.body;
        const [warehouses] = await db.query("SELECT * FROM WAREHOUSES WHERE wid = ?", [wid]);
        if (!warehouses.length) {
            return res.status(404).json({
                status: 404, success: false, message: 'Warehouse not found'
            });
        }
        await db.query("UPDATE WAREHOUSES set just_created = true WHERE wid = ? AND uid = ?", [wid, id]);
        const warehouse = warehouses[0];
        const { warehouseName, address, phone, pin, state, city, country } = warehouse;
        const responsesB = await createWarehouseAsync(wid, warehouseName, phone, address, city, state, country, pin, verified);
        const result = await checkWarehouseServicesStatus(wid);
        let allCreated = false;
        if (result.every(r => r.warehouse_created)) {
            allCreated = true;
        }
        return res.status(200).json({
            status: 200, success: true, response: result, all_created: allCreated, responsesB
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: 500, success: false, message: 'Error occurred while creating warehouse'
        });
    }
}

const updateWarehouse = async (req, res) => {
    const {
        wid,
        name,
        phone,
        address,
        pin
    } = req.body
    const [warehouses] = await db.query('SELECT * FROM WAREHOUSES WHERE wid = ?',[wid])
    const warehouse = warehouses[0]
    const pickrrWarehouseId = warehouse.pickrr_warehouse_id;
    const uid = warehouse.uid;
    const [users] = await db.query('SELECT * FROM USERS where uid = ?',[uid]);
    const user = users[0];

    const updateWarehouseDelhivery500gm = async () => {
        const request = await fetch(`https://track.delhivery.com/api/backend/clientwarehouse/edit/`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${process.env.DELHIVERY_500GM_SURFACE_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, phone, address, pin })
        });
        const response = await request.json()
        return response;
    }
    const updateWarehouseDelhivery10kg = async () => {
        const request = await fetch(`https://track.delhivery.com/api/backend/clientwarehouse/edit/`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${process.env.DELHIVERY_500GM_SURFACE_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, phone, address, pin })
        });
        const response = await request.json()
        return response;
    }
    
    const updateWarehousePickrrWarehouse20kg = async () => {
        const shipRocketLogin = await fetch('https://api-cargo.shiprocket.in/api/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: process.env.SHIPROCKET_REFRESH_TOKEN }),
        })
        const shiprocketLoginData = await shipRocketLogin.json()
        const shiprocketAccess = shiprocketLoginData.access
        const reqBody = {
            "name": name,
            "client_id": process.env.SHIPROCKET_CLIENT_ID,
            "address": {
                "address_line_1": address,
                "address_line_2": address,
                "pincode": pin,
                "city": warehouse.city,
                "state": warehouse.state,
                "country": "India"
            },
            "warehouse_code": name.replace(/\s+/g, ''),
            "contact_person_name": user.fullName,
            "contact_person_email": user.email,
            "contact_person_contact_no": warehouse.phone
        }
        const request = await fetch(`https://api-cargo.shiprocket.in/api/warehouses/${pickrrWarehouseId}/`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${shiprocketAccess}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqBody)
        })
        const response = await request.json()
        return response;
    }

    try {
        
        const responses = await Promise.all([
            updateWarehouseDelhivery500gm(),
            updateWarehouseDelhivery10kg(),
            updateWarehousePickrrWarehouse20kg()
        ])

        return res.status(200).json({
            status: 200, success: true, message: "Warehouse Updated Successfully", response : responses
        });
    } 
    // catch (error) {
    //     return res.status(500).json({
    //         status: 500, success: false, message: error
    //     });
    // } 
    finally {}
}

const getWarehousesServicesStatus = async (req, res) => {
    const token = req.headers.authorization;
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        if (!id) {
            return res.status(400).json({
                status: 400, message: 'Access Denied'
            });
        }
        const { wid } = req.body;
        const result = await checkWarehouseServicesStatus(wid);
        let allCreated = false;
        if (result.every(r => r.warehouse_created)) {
            allCreated = true;
        }
        return res.status(200).json({
            status: 200, success: true, response: result, all_created: allCreated
        });
    } catch (error) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token', success: false, error
        });
    }
}
const justCreatedWarehouseChecked = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, success: false, message: 'Unauthorized'
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const { wid } = req.body;
        await db.query("UPDATE WAREHOUSES set just_created = false WHERE wid =? AND uid =?", [wid, id]);
        return res.status(200).json({
            status: 200, success: true, message: 'Warehouse status checked successfully'
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: 500, success: false, message: 'Error occurred while checking warehouse status'
        });
    }
}
module.exports = { getAllWarehouses, getWarehouses, createWarehouse, updateWarehouse, getWarehousesServicesStatus, reAttemptWarehouseCreation, justCreatedWarehouseChecked };