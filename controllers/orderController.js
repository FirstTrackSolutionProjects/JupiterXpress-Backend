const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const SECRET_KEY = process.env.JWT_SECRET;

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
                address2,
                addressType,
                addressType2,
                postcode,
                city,
                state,
                country,
                Baddress,
                Baddress2,
                BaddressType,
                BaddressType2,
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
                pickupTime
            } = req.body;
            if (same) {
                Baddress = address;
                BaddressType = addressType;
                Baddress2 = address2;
                BaddressType2 = addressType2;
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
                        shipping_address_2,
                        shipping_address_type_2,
                        shipping_country,
                        shipping_state,
                        shipping_city,
                        shipping_postcode,
                        billing_address,
                        billing_address_type,
                        billing_address_2,
                        billing_address_type_2,
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
                        pickup_time
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?, ?, ?, ?,?, ?,?,?)`,
                    [
                        id,
                        order,
                        payMode,
                        name,
                        email,
                        phone,
                        address,
                        addressType,
                        address2,
                        addressType2,
                        country,
                        state,
                        city,
                        postcode,
                        Baddress,
                        BaddressType,
                        Baddress2,
                        BaddressType2,
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
                        pickupTime
                    ]
                );
                for (let i = 0; i < boxes.length; i++) {
                    await transaction.query(
                        `INSERT INTO SHIPMENT_PACKAGES (ord_id, box_no, length, breadth, height, weight) VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            order,
                            boxes[i].box_no,
                            boxes[i].length,
                            boxes[i].breadth,
                            boxes[i].height,
                            boxes[i].weight
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
                returnres.status(500).json({
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
                const [shipment] = await transaction.query(
                    `INSERT INTO INTERNATIONAL_SHIPMENTS (
                        uid,
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
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,  ?, ?, ?, ?, ?)`,
                    [
                        id,
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
                const iid = shipment.insertId;
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
                    status: 200, success: true, message: "Order Created"
                });
            } catch (error) {
                returnres.status(500).json( {
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

module.exports = { createDomesticOrder, createInternationalOrder }