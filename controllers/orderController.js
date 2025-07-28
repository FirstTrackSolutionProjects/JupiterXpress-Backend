const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const SECRET_KEY = process.env.JWT_SECRET;

const deleteDomesticOrder = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: "Access Denied"
        })
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        try {
            const {orderId} = req.body;
            const [orders] = await db.query('SELECT is_manifested FROM SHIPMENTS WHERE ord_id = ?', [orderId]);
            if (orders[0].is_manifested){
                return res.status(400).json({
                    status: 400, message: "Cannot delete a manifested order"
                });
            }
            await db.query('DELETE FROM SHIPMENTS WHERE ord_id = ?', [orderId, id]);
            return res.status(200).json({
                status: 200, message: "Order deleted successfully", success : true
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: 500, message: "Internal Server Error"
            });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({
            status: 500, message: "Internal Server Error"
        });
    }
}

const createDomesticOrder = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: "Access Denied"
        })
    }

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        try {
            let {
                wid,
                payMode,
                name,
                email,
                phone,
                address,
                addressType,
                postcode,
                city,
                state,
                country,
                Baddress,
                BaddressType,
                Bpostcode,
                Bcity,
                Bstate,
                Bcountry,
                same,
                boxes,
                orders,
                discount,
                cod,
                gst,
                Cgst,
                shippingType,
                pickupDate,
                pickupTime,
                invoiceNumber,
                invoiceDate,
                invoiceAmount,
                invoiceUrl,
                shipmentValue,
                ewaybill,
                isB2B,
                customer_reference_number
            } = req.body;
            if (same) {
                Baddress = address;
                BaddressType = addressType;
                Bcountry = country;
                Bstate = state;
                Bcity = city;
                Bpostcode = postcode;
            }

            try {
                const transaction = await db.beginTransaction();
                const [orderIds] = await transaction.query("SELECT domestic_order_ids FROM SYSTEM_CODE_GENERATOR");
                const order = `JUPXD${orderIds[0].domestic_order_ids}`;
                await transaction.query("UPDATE SYSTEM_CODE_GENERATOR SET domestic_order_ids = domestic_order_ids + 1")
                await transaction.query(
                    `INSERT INTO SHIPMENTS (
                        uid,
                        ord_id,
                        pay_method,
                        customer_name,
                        customer_email,
                        customer_mobile,
                        shipping_address,
                        shipping_address_type,
                        shipping_country,
                        shipping_state,
                        shipping_city,
                        shipping_postcode,
                        billing_address,
                        billing_address_type,
                        billing_country,
                        billing_state,
                        billing_city,
                        billing_postcode,
                        cod_amount,
                        total_discount,
                        gst,
                        customer_gst,
                        wid,
                        same,
                        shipping_mode,
                        pickup_date,
                        pickup_time,
                        invoice_number,
                        invoice_date,
                        invoice_amount,
                        invoice_url,
                        shipment_value,
                        ewaybill,
                        is_b2b,
                        customer_reference_number
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?, ?, ?, ?,?, ?,?,?, ?,?,?,?)`,
                    [
                        id,
                        order,
                        payMode,
                        name,
                        email,
                        phone,
                        address,
                        addressType,
                        country,
                        state,
                        city,
                        postcode,
                        Baddress,
                        BaddressType,
                        Bcountry,
                        Bstate,
                        Bcity,
                        Bpostcode,
                        cod,
                        discount,
                        gst,
                        Cgst,
                        wid,
                        same,
                        shippingType,
                        pickupDate,
                        pickupTime,
                        invoiceNumber,
                        invoiceDate,
                        invoiceAmount,
                        invoiceUrl,
                        shipmentValue,
                        ewaybill,
                        isB2B,
                        customer_reference_number
                    ]
                );
                for (let i = 0; i < boxes.length; i++) {
                    await transaction.query(
                        `INSERT INTO SHIPMENT_PACKAGES (ord_id, box_no, length, breadth, height, weight, weight_unit, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            order,
                            boxes[i].box_no,
                            boxes[i].length,
                            boxes[i].breadth,
                            boxes[i].height,
                            boxes[i].weight,
                            boxes[i].weight_unit,
                            boxes[i].quantity
                        ]
                    );
                }
                for (let i = 0; i < orders.length; i++) {
                    await transaction.query(
                        `INSERT INTO ORDERS VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            order,
                            orders[i].box_no,
                            null,
                            orders[i].product_name,
                            orders[i].product_quantity,
                            orders[i].tax_in_percentage,
                            orders[i].selling_price,
                            null
                        ]
                    );
                }
                await db.commit(transaction);
                return res.status(200).json({
                    status: 200, success: true, message: "Details Submitted"
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 500,
                    message: error.message,
                    orders: orders,
                    error: error.message,
                });
            }
        }
        catch (err) {
            return res.status(400).json({
                status: 400, message: "Something went wrong"
            });
        }
    }
    catch (err) {
        return res.status(400).json({
            status: 400, message: "Invalid Token"
        });
    }
}

const createInternationalOrder = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return {
            status: 401, message: "Access Denied"
        };
    }

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        try {
            const {
                wid,
                contents,
                serviceCode,
                consigneeName,
                consigneeCompany,
                countryCode,
                consigneeContact,
                consigneeEmail,
                consigneeAddress,
                consigneeAddress2,
                consigneeAddress3,
                consigneeCity,
                consigneeState,
                consigneeCountry,
                consigneeZipCode,
                dockets,
                items,
                gst,
                shippingType,
                actual_weight,
                price
            } = req.body;

            try {
                const transaction = await db.beginTransaction();
                const [orderIds] = await transaction.query("SELECT international_order_ids FROM SYSTEM_CODE_GENERATOR");
                await transaction.query("UPDATE SYSTEM_CODE_GENERATOR SET international_order_ids = international_order_ids + 1")
                const orderId = `JUPXI${orderIds[0].international_order_ids}`;
                const [shipment] = await transaction.query(
                    `INSERT INTO INTERNATIONAL_SHIPMENTS (
                        uid,
                        iid,
                        wid,
                        contents,
                        service_code,
                        consignee_name,
                        consignee_company_name,
                        consignee_country_code,
                        consignee_contact_no,
                        consignee_email,
                        consignee_address_1,
                        consignee_address_2,
                        consignee_address_3,
                        consignee_city,
                        consignee_state,
                        consignee_country,
                        consignee_zip_code,
                        shippingType,
                        gst,
                        shipping_price,
                        actual_weight
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id,
                        orderId,
                        wid,
                        contents,
                        serviceCode,
                        consigneeName,
                        consigneeCompany,
                        countryCode,
                        consigneeContact,
                        consigneeEmail,
                        consigneeAddress,
                        consigneeAddress2,
                        consigneeAddress3,
                        consigneeCity,
                        consigneeState,
                        consigneeCountry,
                        consigneeZipCode,
                        shippingType,
                        gst,
                        price,
                        actual_weight
                    ]
                );
                for (let i = 0; i < dockets.length; i++) {
                    const [docket] = await transaction.query(
                        `INSERT INTO DOCKETS (box_no, iid, docket_weight, length, breadth, height ) VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            dockets[i].box_no,
                            orderId,
                            dockets[i].docket_weight,
                            dockets[i].length,
                            dockets[i].breadth,
                            dockets[i].height,
                        ]
                    );
                    const did = docket.insertId;
                    const docketItems = items.filter(item => item.box_no == i + 1)
                    for (let j = 0; j < docketItems.length; j++) {
                        await transaction.query(
                            `INSERT INTO DOCKET_ITEMS (did, hscode, box_no, quantity, rate, description, unit, unit_weight, igst_amount, iid) VALUES (?,?,?,?,?,?,?,?,?,?)`,
                            [
                                did,
                                docketItems[j].hscode,
                                docketItems[j].box_no,
                                docketItems[j].quantity,
                                docketItems[j].rate,
                                docketItems[j].description,
                                docketItems[j].unit,
                                docketItems[j].unit_weight,
                                docketItems[j].igst_amount,
                                orderId
                            ]
                        );
                    }
                }
                await db.commit(transaction);
                return res.status(200).json({
                    status: 200, success: true, message: "Order Created"
                });
            } catch (error) {
                return res.status(500).json({
                    status: 500,
                    message: error.message,
                    error: error.message
                });
            }
        } catch (err) {
            return res.status(500).json({
                status: 500, message: "Something went wrong"
            });
        }
    } catch (err) {
        return res.status(400).json({
            status: 400, message: "Invalid Token"
        });
    }
}

const updateInternationalOrder = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: "Access Denied"
        });
    }

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        try {
            const {
                iid,
                wid,
                contents,
                serviceCode,
                consigneeName,
                consigneeCompany,
                countryCode,
                consigneeContact,
                consigneeEmail,
                consigneeAddress,
                consigneeAddress2,
                consigneeAddress3,
                consigneeCity,
                consigneeState,
                consigneeCountry,
                consigneeZipCode,
                dockets,
                items,
                gst,
                shippingType,
                actual_weight,
                price
            } = req.body;

            try {
                const transaction = await db.beginTransaction();
                const [shipment] = await transaction.query(
                    `UPDATE INTERNATIONAL_SHIPMENTS SET
  wid = ?,
  contents = ?,
  service_code = ?,
  consignee_name = ?,
  consignee_company_name = ?,
  consignee_country_code = ?,
  consignee_contact_no = ?,
  consignee_email = ?,
  consignee_address_1 = ?,
  consignee_address_2 = ?,
  consignee_address_3 = ?,
  consignee_city = ?,
  consignee_state = ?,
  consignee_country = ?,
  consignee_zip_code = ?,
  shippingType = ?,
  gst = ?,
  shipping_price = ?,
  actual_weight = ? WHERE iid = ?`,
                    [
                        wid,
                        contents,
                        serviceCode,
                        consigneeName,
                        consigneeCompany,
                        countryCode,
                        consigneeContact,
                        consigneeEmail,
                        consigneeAddress,
                        consigneeAddress2,
                        consigneeAddress3,
                        consigneeCity,
                        consigneeState,
                        consigneeCountry,
                        consigneeZipCode,
                        shippingType,
                        gst,
                        price,
                        actual_weight,
                        iid
                    ]
                );
                await transaction.query('DELETE FROM DOCKET_ITEMS WHERE iid = ?', [iid])
                await transaction.query('DELETE FROM DOCKETS WHERE iid = ?', [iid])
                for (let i = 0; i < dockets.length; i++) {
                    const [docket] = await transaction.query(
                        `INSERT INTO DOCKETS (box_no, iid, docket_weight, length, breadth, height ) VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            dockets[i].box_no,
                            iid,
                            dockets[i].docket_weight,
                            dockets[i].length,
                            dockets[i].breadth,
                            dockets[i].height,
                        ]
                    );
                    const did = docket.insertId;
                    const docketItems = items.filter(item => item.box_no == i + 1)
                    for (let j = 0; j < docketItems.length; j++) {
                        await transaction.query(
                            `INSERT INTO DOCKET_ITEMS (did, hscode, box_no, quantity, rate, description, unit, unit_weight, igst_amount, iid) VALUES (?,?,?,?,?,?,?,?,?,?)`,
                            [
                                did,
                                docketItems[j].hscode,
                                docketItems[j].box_no,
                                docketItems[j].quantity,
                                docketItems[j].rate,
                                docketItems[j].description,
                                docketItems[j].unit,
                                docketItems[j].unit_weight,
                                docketItems[j].igst_amount,
                                iid
                            ]
                        );
                    }
                }
                await db.commit(transaction);
                return res.status(200).json({
                    status: 200, success: true, message: "Order Updated"
                });
            } catch (error) {
                return res.status(500).json({
                    status: 500,
                    message: error.message,
                    error: error.message,
                });
            }
        } catch (err) {
            return res.status(500).json({
                status: 500, message: "Something went wrong"
            });
        }
    } catch (err) {
        return res.status(400).json({
            status: 400, message: "Invalid Token"
        });
    }
}

// const getAllDomesticOrders = async (req, res) => {
//     const token = req.headers.authorization;
//     try {
//         const verified = jwt.verify(token, SECRET_KEY);
//         const admin = verified.admin;
//         const id = verified.id;
//         if (!admin) {
//             try {
//                 const [rows] = await db.query('SELECT * FROM SHIPMENTS s JOIN WAREHOUSES w ON s.wid=w.wid WHERE s.uid = ?', [id]);
//                 return res.status(200).json({
//                     status: 200, success: true, order: rows
//                 });
//             } catch (error) {
//                 return res.status(500).json({
//                     status: 500, message: 'Error', error: error.message
//                 });
//             }
//         }

//         try {
//             const [rows] = await db.query('SELECT * FROM SHIPMENTS s JOIN WAREHOUSES w ON s.wid=w.wid JOIN USERS u ON s.uid=u.uid');
//             return res.status(200).json({
//                 status: 200, success: true, order: rows
//             });
//         } catch (error) {
//             return res.status(500).json({
//                 status: 500, message: 'Error logging in', error: error.message
//             });
//         }
//     } catch (e) {
//         return res.status(400).json({
//             status: 400, message: 'Invalid Token'
//         });
//     }
// }

const getAllDomesticOrders = async (req, res) => {
    const token = req.headers.authorization;
    const {
        orderId,
        merchant_email,
        merchant_name,
        page = 1,
        startDate,
        endDate,
    } = req.query;

    const limit = 50;
    const offset = (page - 1) * limit;

    const formatDateTimeRange = (start, end) => {
        let from = null, to = null;
        if (start) from = `${start}`;
        if (end) to = `${end}`;
        return { from, to };
    };

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        if (!verified.admin) {
            return res.status(403).json({ status: 403, message: 'Access denied. Admins only.' });
        }

        let whereClauses = [];
        let values = [];

        if (merchant_email) {
            whereClauses.push('u.email = ?');
            values.push(merchant_email);
        }

        if (merchant_name) {
            whereClauses.push('u.fullName LIKE ?');
            values.push(`%${merchant_name}%`);
        }

        if (orderId) {
            whereClauses.push('s.ord_id = ?');
            values.push(orderId);
        }

        const { from: startDateTime, to: endDateTime } = formatDateTimeRange(startDate, endDate);

        if (startDateTime && endDateTime) {
            whereClauses.push('s.date BETWEEN ? AND ?');
            values.push(startDateTime, endDateTime);
        } else if (startDateTime) {
            whereClauses.push('s.date >= ?');
            values.push(startDateTime);
        } else if (endDateTime) {
            whereClauses.push('s.date <= ?');
            values.push(endDateTime);
        }

        const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM SHIPMENTS s
            JOIN WAREHOUSES w ON s.wid = w.wid
            JOIN USERS u ON s.uid = u.uid
            ${whereSQL}
        `;
        const [countResult] = await db.query(countQuery, values);
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        const dataQuery = `
            SELECT s.*, w.*, u.fullName, u.email, u.phone, sv.service_name
            FROM SHIPMENTS s
            JOIN WAREHOUSES w ON s.wid = w.wid
            JOIN USERS u ON s.uid = u.uid
            LEFT JOIN SERVICES sv ON s.serviceId = sv.service_id
            ${whereSQL}
            ORDER BY s.date DESC
            LIMIT ? OFFSET ?
        `;
        const dataValues = [...values, limit, offset];
        const [rows] = await db.query(dataQuery, dataValues);

        return res.status(200).json({
            status: 200,
            success: true,
            page: Number(page),
            totalPages,
            count: rows.length,
            hasPrevious: Number(page) > 1,
            hasNext: Number(page) < totalPages,
            orders: rows,
        });

    } catch (error) {
        return res.status(400).json({
            status: 400,
            message: 'Invalid Token or Query Error',
            error: error.message,
        });
    }
};

const getDomesticOrders= async (req, res) => {
    const token = req.headers.authorization;
    const {
        orderId,
        customer_name,
        customer_email,
        page = 1,
        startDate,
        endDate,
    } = req.query;

    const limit = 50;
    const offset = (page - 1) * limit;

    const formatDateTimeRange = (start, end) => {
        let from = null, to = null;
        if (start) from = `${start}`;
        if (end) to = `${end}`;
        return { from, to };
    };

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        if (verified.admin) {
            return res.status(403).json({ status: 403, message: 'Only regular users allowed.' });
        }

        const userId = verified.id;

        let whereClauses = ['s.uid = ?'];
        let values = [userId];

        if (orderId) {
            whereClauses.push('s.ord_id = ?');
            values.push(orderId);
        }

        if (customer_name) {
            whereClauses.push('s.customer_name LIKE ?');
            values.push(`%${customer_name}%`);
        }

        if (customer_email) {
            whereClauses.push('s.customer_email LIKE ?');
            values.push(`%${customer_email}%`);
        }

        const { from: startDateTime, to: endDateTime } = formatDateTimeRange(startDate, endDate);
        if (startDateTime && endDateTime) {
            whereClauses.push('s.date BETWEEN ? AND ?');
            values.push(startDateTime, endDateTime);
        } else if (startDateTime) {
            whereClauses.push('s.date >= ?');
            values.push(startDateTime);
        } else if (endDateTime) {
            whereClauses.push('s.date <= ?');
            values.push(endDateTime);
        }

        const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

        // Total count
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM SHIPMENTS s
            JOIN WAREHOUSES w ON s.wid = w.wid
            ${whereSQL}
        `;
        const [countResult] = await db.query(countQuery, values);
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        // Data fetch
        const dataQuery = `
            SELECT s.*, w.*
            FROM SHIPMENTS s
            JOIN WAREHOUSES w ON s.wid = w.wid
            ${whereSQL}
            ORDER BY s.date DESC
            LIMIT ? OFFSET ?
        `;
        const dataValues = [...values, limit, offset];
        const [rows] = await db.query(dataQuery, dataValues);

        return res.status(200).json({
            status: 200,
            success: true,
            page: Number(page),
            totalPages,
            count: rows.length,
            hasPrevious: Number(page) > 1,
            hasNext: Number(page) < totalPages,
            orders: rows,
        });

    } catch (error) {
        return res.status(400).json({
            status: 400,
            message: 'Invalid Token or Query Error',
            error: error.message,
        });
    }
};

const getAllDomesticOrdersOld = async (req, res) => {
    const token = req.headers.authorization;
    const {
        orderId,
        customer_email,
        customer_name,
        page = 1,
        startDate,
        endDate,
    } = req.query;

    const limit = 50;
    const offset = (page - 1) * limit;

    const formatDateTimeRange = (start, end) => {
        let from = null, to = null;
        if (start) from = `${start}`;
        if (end) to = `${end}`;
        return { from, to };
    };

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        const id = verified.id;
        
        if (!admin) {
            // For merchants, add filtering and pagination
            let whereClauses = ['s.uid = ?'];
            let values = [id];

            if (customer_email) {
                whereClauses.push('s.customer_email LIKE ?');
                values.push(`%${customer_email}%`);
            }

            if (customer_name) {
                whereClauses.push('s.customer_name LIKE ?');
                values.push(`%${customer_name}%`);
            }

            if (orderId) {
                whereClauses.push('s.ord_id = ?');
                values.push(orderId);
            }

            const { from: startDateTime, to: endDateTime } = formatDateTimeRange(startDate, endDate);

            if (startDateTime && endDateTime) {
                whereClauses.push('s.date BETWEEN ? AND ?');
                values.push(startDateTime, endDateTime);
            } else if (startDateTime) {
                whereClauses.push('s.date >= ?');
                values.push(startDateTime);
            } else if (endDateTime) {
                whereClauses.push('s.date <= ?');
                values.push(endDateTime);
            }

            const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

            try {
                // Count total records
                const countQuery = `
                    SELECT COUNT(*) AS total
                    FROM SHIPMENTS s
                    JOIN WAREHOUSES w ON s.wid = w.wid
                    ${whereSQL}
                `;
                const [countResult] = await db.query(countQuery, values);
                const total = countResult[0].total;
                const totalPages = Math.ceil(total / limit);

                // Get paginated data
                const dataQuery = `
                    SELECT s.*, w.*, sv.service_name
                    FROM SHIPMENTS s
                    JOIN WAREHOUSES w ON s.wid = w.wid
                    LEFT JOIN SERVICES sv ON s.serviceId = sv.service_id
                    ${whereSQL}
                    ORDER BY s.date DESC
                    LIMIT ? OFFSET ?
                `;
                const dataValues = [...values, limit, offset];
                const [rows] = await db.query(dataQuery, dataValues);

                return res.status(200).json({
                    status: 200,
                    success: true,
                    page: Number(page),
                    totalPages,
                    count: rows.length,
                    hasPrevious: Number(page) > 1,
                    hasNext: Number(page) < totalPages,
                    order: rows
                });
            } catch (error) {
                return res.status(500).json({
                    status: 500, message: 'Error', error: error.message
                });
            }
        }

        // For admins, return all data (existing logic)
        try {
            const [rows] = await db.query('SELECT * FROM SHIPMENTS s JOIN WAREHOUSES w ON s.wid=w.wid JOIN USERS u ON s.uid=u.uid');
            return res.status(200).json({
                status: 200, success: true, order: rows
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, message: 'Error logging in', error: error.message
            });
        }
    } catch (e) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}


const getDomesticOrderBoxes = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: "Access Denied"
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const { order } = req.body;
        if (!order) {
            return res.status(400).json({
                status: 400, message: "Order ID is required"
            });
        }

        try {
            const [rows] = await db.query(
                "SELECT * FROM SHIPMENT_PACKAGES WHERE ord_id = ?",
                [order]
            );
            if (rows.length > 0) {
                return res.status(200).json({
                    status: 200, success: true, order: rows
                });
            } else {
                return res.status(401).json({
                    status: 401, message: "Invalid id"
                });
            }
        } catch (error) {
            return res.status(500).json({

                status: 500,
                message: "Unexpected Error while getting boxes",
                error: error.message,

            });
        }
    } catch (err) {
        return res.status(401).json({
            status: 401,
            message: "Access Denied"
        });
    }
}

const getInternationalOrderDocketItems = async (req, res) => {
    const token = req.headers.authorization;
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const { iid } = req.body;

        try {
            const [rows] = await db.query('SELECT * FROM DOCKET_ITEMS WHERE iid = ?', [iid]);
            return res.status(200).json({
                status: 200, success: true, dockets: rows
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, message: 'Error', error: error.message
            });
        }
    } catch (e) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const getInternationalOrderDockets = async (req, res) => {
    const token = req.headers.authorization;
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const { iid } = req.body;
        try {
            const [rows] = await db.query('SELECT * FROM DOCKETS WHERE iid = ?', [iid]);
            return res.status(200).json({
                status: 200, success: true, dockets: rows
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

const getInternationalOrders = async (req, res) => {
    const token = req.headers.authorization;
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const admin = verified.admin;
        try {
            if (admin) {
                const [rows] = await db.query('SELECT * FROM INTERNATIONAL_SHIPMENTS s JOIN WAREHOUSES w ON s.wid=w.wid JOIN USERS u ON u.uid=s.uid');

                return res.status(200).json({
                    status: 200, success: true, order: rows
                });

            } else {
                const [rows] = await db.query('SELECT * FROM INTERNATIONAL_SHIPMENTS s JOIN WAREHOUSES w ON s.wid=w.wid WHERE s.uid = ?', [id]);
                return res.status(200).json({
                    status: 200, success: true, order: rows
                });

            }
        } catch (error) {
            return res.status(500).json({
                status: 500, message: 'Error logging in', error: error.message
            });
        }
    } catch (e) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const getDomesticOrder = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: "Access Denied"
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const { order } = req.body;

        try {
            const [rows] = await db.query(
                "SELECT * FROM ORDERS WHERE ord_id = ?",
                [order]
            );
            return res.status(200).json({
                status: 200, success: true, order: rows
            });
        } catch (error) {
            return res.status(500).json({
                status: 500,
                message: "Unexpected Error while getting orders",
                error: error.message
            });
        }
    } catch (err) {
        return res.status(401).json({
            status: 401, message: "Access Denied"
        });
    }
}

const updateDomesticOrder = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        let id = verified.id;
        try {
            let {
                wid,
                order,
                payMode,
                name,
                email,
                phone,
                address,
                addressType,
                postcode,
                city,
                state,
                country,
                Baddress,
                BaddressType,
                Bpostcode,
                Bcity,
                Bstate,
                Bcountry,
                same,
                boxes,
                orders,
                discount,
                cod,
                gst,
                Cgst,
                shippingType,
                pickupDate,
                pickupTime,
                invoiceNumber,
                invoiceDate,
                invoiceAmount,
                invoiceUrl,
                shipmentValue,
                ewaybill,
                isB2B,
                customer_reference_number
            } = req.body;

            if (admin) {
                const [users] = await db.query("SELECT * FROM WAREHOUSES w JOIN USERS u ON u.uid = w.uid WHERE w.wid = ?", [wid])
                id = users[0].uid
            }
            if (same) {
                Baddress = address;
                BaddressType = addressType;
                Bcountry = country;
                Bstate = state;
                Bcity = city;
                Bpostcode = postcode;
            }




            try {
                const transaction = await db.beginTransaction();
                await transaction.query(`UPDATE SHIPMENTS SET 
            pay_method = ?, 
            customer_name = ?, 
            customer_email = ?, 
            customer_mobile = ?, 
            shipping_address = ?, 
            shipping_address_type = ?, 
            shipping_country = ?, 
            shipping_state = ?, 
            shipping_city = ?, 
            shipping_postcode = ?, 
            billing_address = ?, 
            billing_address_type = ?, 
            billing_country = ?, 
            billing_state = ?, 
            billing_city = ?, 
            billing_postcode = ?,
            same = ?, 
            cod_amount = ?, 
            total_discount = ?, 
            gst = ?, 
            customer_gst = ?,
            wid = ?,
            shipping_mode =?,
            pickup_date =?,
            pickup_time =?,
            invoice_number =?,
            invoice_date =?,
            invoice_amount =?,
            invoice_url =?,
            shipment_value =?,
            ewaybill =?,
            is_b2b =?,
            customer_reference_number =?
            WHERE ord_id = ? AND uid = ?`,
                    [payMode, name, email, phone, address, addressType, country, state, city, postcode, Baddress, BaddressType, Bcountry, Bstate, Bcity, Bpostcode, same, cod, discount, gst, Cgst, wid, shippingType, pickupDate, pickupTime, invoiceNumber, invoiceDate, invoiceAmount, invoiceUrl, shipmentValue, ewaybill, isB2B, customer_reference_number, order, id]
                );

                await transaction.query("DELETE FROM ORDERS WHERE ord_id = ?", [order]);
                await transaction.query("DELETE FROM SHIPMENT_PACKAGES WHERE ord_id = ?", [order]);

                for (let i = 0; i < boxes.length; i++) {
                    await transaction.query(
                        `INSERT INTO SHIPMENT_PACKAGES (ord_id, box_no, length, breadth, height, weight, weight_unit, quantity ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            order,
                            boxes[i].box_no,
                            boxes[i].length,
                            boxes[i].breadth,
                            boxes[i].height,
                            boxes[i].weight,
                            boxes[i].weight_unit,
                            boxes[i].quantity
                        ]
                    );

                }
                for (let j = 0; j < orders.length; j++) {
                    await transaction.query(
                        `INSERT INTO ORDERS (ord_id, box_no, product_name, product_quantity, tax_in_percentage, selling_price) VALUES (?,?,?,?,?,?)`,
                        [
                            order,
                            orders[j].box_no,
                            orders[j].product_name,
                            orders[j].product_quantity,
                            orders[j].tax_in_percentage,
                            orders[j].selling_price
                        ]
                    );
                }
                await db.commit(transaction);
                return res.status(200).json({
                    status: 200, success: true, message: 'Details Updated', id: id
                });
            }
            catch (error) {
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

const cloneDomesticOrder = async (req, res) => {
    let transaction;
    try {
        const { id } = req.user;
        const orderId = req.params.ord_id;
        const [orders] = await db.query('SELECT * FROM SHIPMENTS WHERE ord_id = ? AND uid = ?', [orderId, id]);
        if (!orders || orders.length === 0) {
            return res.status(404).json({ status: 404, message: 'Order not found' });
        }

        const order = orders[0];
        const columns = [
            'uid', 'ord_date', 'wid', 'channel', 'pay_method',
            'customer_name', 'customer_email', 'customer_mobile',
            'shipping_address', 'shipping_address_type', 'shipping_address_2', 'shipping_address_type_2',
            'shipping_country', 'shipping_state', 'shipping_city', 'shipping_postcode',
            'billing_address', 'billing_address_type', 'billing_address_2', 'billing_address_type_2',
            'billing_country', 'billing_state', 'billing_city', 'billing_postcode',
            'shipping_charge', 'cod_amount', 'gift_wrap', 'total_discount',
            'gst', 'customer_gst', 'shipping_mode', 'same',
            'pickup_date', 'pickup_time', 'ewaybill', 'in_process',
            'invoice_number', 'invoice_date', 'invoice_amount', 'invoice_url',
            'is_b2b', 'shipment_value'
        ];

        const newOrder = Object.fromEntries(columns.map(col => [col, order[col]]));

        transaction = await db.beginTransaction();

        const [orderIds] = await transaction.query("SELECT domestic_order_ids FROM SYSTEM_CODE_GENERATOR");
        const cloneOrderId = `JUPXD${orderIds[0].domestic_order_ids}`;

        await transaction.query("UPDATE SYSTEM_CODE_GENERATOR SET domestic_order_ids = domestic_order_ids + 1");

        await transaction.query(
            `INSERT INTO SHIPMENTS (ord_id, ${columns.join(',')}) VALUES (?, ${columns.map(() => '?').join(',')})`,
            [cloneOrderId, ...columns.map(col => newOrder[col])]
        );

        const [originalOrderBoxes] = await transaction.query(
          `SELECT * FROM SHIPMENT_PACKAGES WHERE ord_id = ?`, 
          [orderId]
        );

        // Remove unwanted fields like primary key (e.g., `id`) if needed
        const newOrderBoxes = originalOrderBoxes.map(box => {
          const { ord_id, ...rest } = box; // Assuming `id` is auto-increment
          return { ...rest, ord_id: cloneOrderId };
        });

        // Extract column names and rows
        const boxColumns = Object.keys(newOrderBoxes[0]);
        const values = newOrderBoxes.map(obj => boxColumns.map(col => obj[col]));

        const placeholders = values.map(() => `(${boxColumns.map(() => '?').join(',')})`).join(',');

        await transaction.query(
          `INSERT INTO SHIPMENT_PACKAGES (${boxColumns.join(',')}) VALUES ${placeholders}`,
          values.flat()
        );




        const [originalOrderItems] = await transaction.query(
          `SELECT * FROM ORDERS WHERE ord_id = ?`, 
          [orderId]
        );


        const newOrderItems = originalOrderItems.map(item => {
          const { ord_id, ...rest } = item;
          return { ...rest, ord_id: cloneOrderId };
        });

        //Extract items columns and rows
        
        const itemsColumns = Object.keys(originalOrderItems[0]);
        const itemsValues = newOrderItems.map(obj => itemsColumns.map(col => obj[col]));
        const itemsPlaceholders = itemsValues.map(() => `(${itemsColumns.map(() => '?').join(',')})`).join(',');
        
        await transaction.query(
          `INSERT INTO ORDERS (${itemsColumns.join(',')}) VALUES ${itemsPlaceholders}`,
          itemsValues.flat()
        );


        await transaction.commit();

        return res.status(200).json({
            status: 200,
            success: true,
            message: 'Order cloned successfully',
            newOrderId: cloneOrderId
        });
    } catch (error) {
        console.error(error)
        if (transaction) await transaction.rollback();
        return res.status(500).json({
            status: 500,
            message: error.message
        });
    }
};

module.exports = {
    createDomesticOrder,
    createInternationalOrder,
    getAllDomesticOrders,
    getDomesticOrders,
    getDomesticOrderBoxes,
    getInternationalOrderDocketItems,
    getInternationalOrderDockets,
    getInternationalOrders,
    getDomesticOrder,
    updateDomesticOrder,
    updateInternationalOrder,
    deleteDomesticOrder,
    getAllDomesticOrdersOld,
    cloneDomesticOrder
}