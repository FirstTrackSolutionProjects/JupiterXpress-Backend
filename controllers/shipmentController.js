const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { s3 } = require('../utils/aws_s3');
const { transporter } = require('../utils/email');

const SECRET_KEY = process.env.JWT_SECRET;

const cancelShipment = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const { order } = req.body;
        if (!order) {
            return res.status(400).json({ message: 'Order ID is required' });
        }
        const [shipments] = await db.query('SELECT * FROM SHIPMENTS WHERE ord_id = ?', [order]);
        const shipment = shipments[0];
        const { serviceId, categoryId, awb, uid } = shipment;
        const [users] = await db.query('SELECT * FROM USERS WHERE uid = ?', [uid]);
        const email = users[0].email;
        // const [orders] = await db.query('SELECT * FROM ORDERS WHERE ord_id = ? ', [order]);

        if (serviceId == "1") {


            const responseDta = await fetch(`https://track.delhivery.com/api/p/edit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Token ${categoryId == "2" ? process.env.DELHIVERY_500GM_SURFACE_KEY : categoryId == "1" ? process.env.DELHIVERY_10KG_SURFACE_KEY : categoryId == 3 ? '' : ''}`
                },
                body: JSON.stringify({ waybill: awb, cancellation: true })
            })
            const response = await responseDta.json()
            if (response.status) {
                const transaction = await db.beginTransaction()
                const [expenses] = await transaction.query('SELECT * FROM EXPENSES WHERE expense_order = ? AND uid = ?', [order, uid])
                const price = expenses[0].expense_cost
                await transaction.query('UPDATE SHIPMENTS set cancelled = ? WHERE awb = ? AND uid = ?', [1, awb, uid])
                if (shipment.pay_method != "topay") {
                    await transaction.query('UPDATE WALLET SET balance = balance + ? WHERE uid = ?', [parseInt(price), uid]);
                    await transaction.query('INSERT INTO REFUND (uid, refund_order, refund_amount) VALUES  (?,?,?)', [uid, order, price])
                }
                await db.commit(transaction)
            }
            else {
                return res.status(400).json({
                    status: 400, success: false, message: response
                });
            }
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Shipment cancelled successfully',
                text: `Dear Merchant, \nYour shipment request for Order id : ${order} is successfully cancelled and the corresponding refund is credited to your wallet.\nRegards,\nJupiter Xpress`
            };
            await transporter.sendMail(mailOptions)
            return res.status(200).json({
                status: 200, message: response, success: true
            })
        }

    } catch (error) {
        return res.status(500).json({
            status: 500, response: error, success: false
        });
    }
}

const createDomesticShipment = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const [users] = await db.query('SELECT * FROM USERS WHERE uid =?', [id]);
        const email = users[0].email;
        const { order, price, serviceId, categoryId } = req.body;
        if (!order || !serviceId || !categoryId || !price) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const [shipments] = await db.query('SELECT * FROM SHIPMENTS WHERE ord_id = ? ', [order]);
        const shipment = shipments[0];
        const [boxes] = await db.query('SELECT * FROM SHIPMENT_PACKAGES WHERE ord_id = ? ', [order]);
        const [orders] = await db.query('SELECT * FROM ORDERS WHERE ord_id = ? ', [order]);
        const [warehouses] = await db.query('SELECT * FROM WAREHOUSES WHERE uid = ? AND wid = ?', [id, shipment.wid]);
        const warehouse = warehouses[0];
        const [systemCodes] = await db.query('SELECT * FROM SYSTEM_CODE_GENERATOR');
        const refId = systemCodes[0].shipment_reference_id;
        await db.query('UPDATE SYSTEM_CODE_GENERATOR SET shipment_reference_id = ? WHERE shipment_reference_id = ?', [parseInt(refId) + 1, refId]);

        let total_amount = 0;
        for (let i = 0; i < orders.length; i++) {
            total_amount += (parseFloat(orders[i].selling_price) * parseFloat(orders[i].product_quantity));
        }

        let product_description = "";
        for (let i = 0; i < orders.length; i++) {
            product_description += `${orders[i].product_name} (${orders[i].product_quantity}) (₹${orders[i].selling_price})\n`;
        }

        if (serviceId === "1") {
            if (boxes.length > 1) {
                return res.status(200).json({
                    status: 200,
                    success: false,
                    message: "More than 1 box is not allowed on this service"
                });
            }

            const waybillReq = await fetch(`https://track.delhivery.com/waybill/api/bulk/json/?count=1`, {
                method: 'GET',
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    'Authorization': `Token ${categoryId === "2" ? process.env.DELHIVERY_500GM_SURFACE_KEY : categoryId === "1" ? process.env.DELHIVERY_10KG_SURFACE_KEY : categoryId === 3 ? '' : ''}`
                }
            });

            const waybill = await waybillReq.json();
            const reqBody = {
                shipments: [],
                pickup_location: {
                    name: warehouse.warehouseName,
                    add: warehouse.address,
                    pin_code: warehouse.pin,
                    phone: warehouse.phone,
                }
            };

            reqBody.shipments.push({
                "name": shipment.customer_name,
                "add": shipment.shipping_address,
                "pin": shipment.shipping_postcode,
                "city": shipment.shipping_city,
                "state": shipment.shipping_state,
                "country": shipment.shipping_country,
                "phone": shipment.customer_mobile,
                "order": `JUP${refId}`,
                "payment_mode": shipment.pay_method == "topay" ? "COD" : shipment.pay_method,
                "return_pin": "",
                "return_city": "",
                "return_phone": "",
                "return_add": "",
                "return_state": "",
                "return_country": "",
                "products_desc": product_description,
                "hsn_code": shipment.hsn ? shipment.hsn : "",
                "cod_amount": shipment.cod_amount,
                "order_date": shipment.date.toISOString().split("T")[0],
                "total_amount": total_amount,
                "seller_add": warehouse.address,
                "seller_name": warehouse.warehouseName,
                "seller_inv": "",
                "quantity": "1",
                "waybill": waybill,
                "shipment_length": shipment.length,
                "shipment_width": shipment.breadth,
                "shipment_height": shipment.height,
                "weight": shipment.weight,
                "seller_gst_tin": shipment.gst,
                "shipping_mode": shipment.shippingType,
                "address_type": shipment.shipping_address_type
            });

            const formData = new URLSearchParams();
            formData.append('format', 'json');
            formData.append('data', JSON.stringify(reqBody));

            const responseDta = await fetch(`https://track.delhivery.com/api/cmu/create.json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'Authorization': `Token ${categoryId === "2" ? process.env.DELHIVERY_500GM_SURFACE_KEY : categoryId === "1" ? process.env.DELHIVERY_10KG_SURFACE_KEY : categoryId === 3 ? '' : ''}`
                },
                body: formData
            });

            const response = await responseDta.json();
            if (response.success) {
                const transaction = await db.beginTransaction();
                await transaction.query('UPDATE SHIPMENTS set serviceId = ?, categoryId = ?, awb = ? WHERE ord_id = ?', [serviceId, categoryId, response.packages[0].waybill, order]);
                await transaction.query('INSERT INTO SHIPMENT_REPORTS VALUES (?,?,?)', [refId, order, "SHIPPED"]);
                if (shipment.pay_method != "topay") {
                    await transaction.query('UPDATE WALLET SET balance = balance - ? WHERE uid = ?', [price, id]);
                    await transaction.query('INSERT INTO EXPENSES (uid, expense_order, expense_cost) VALUES  (?,?,?)', [id, order, price]);
                }
                await db.commit(transaction);
            } else {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: response
                });
            }

            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Shipment created successfully',
                text: `Dear Merchant, \nYour shipment request for Order id : ${order} is successfully created at Delhivery Courier Service 
              and the corresponding charge is deducted from your wallet.\nRegards,\nJupiter Xpress`
            };
            await transporter.sendMail(mailOptions);

            return res.status(200).json({
                status: 200,
                response: response,
                success: true
            });

        } else if (serviceId == '2') {
            const loginPayload = {
                grant_type: "client_credentials",
                client_id: process.env.MOVIN_CLIENT_ID,
                client_secret: process.env.MOVIN_CLIENT_SECRET,
                Scope: `${process.env.MOVIN_SERVER_ID}/.default`,
            };
            const formBody = Object.entries(loginPayload).map(
                ([key, value]) =>
                    encodeURIComponent(key) + "=" + encodeURIComponent(value)
            ).join("&");

            const login = await fetch(`https://login.microsoftonline.com/${process.env.MOVIN_TENANT_ID}/oauth2/v2.0/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: formBody
            });

            const loginRes = await login.json();
            const token = loginRes.access_token;
            const reqBody = {
                communication_email: "jupiterxpress2024@gmail.com",
                payload: [
                    {
                        shipment: {
                            shipment_unique_id: `JUP${refId}`,
                            shipment_type: 'Forward',
                            forward_shipment_number: `JUP${refId}`,
                            ship_from_account: process.env.MOVIN_ACCOUNT_NUMBER,
                            ship_from_company: users[0].businessName,
                            ship_from_address_line1: warehouse.address,
                            ship_from_address_line2: warehouse.address,
                            ship_from_address_line3: warehouse.address,
                            ship_from_zipcode: warehouse.pin,
                            ship_from_email: "jupiterxpress2024@gmail.com",
                            ship_from_phone: users[0].phone,
                            shipment_date: shipment.pickup_date,
                            shipment_priority: categoryId == 1 ? 'Express End of Day' : 'Standard Premium',
                            ship_to_first_name: shipment.customer_name.split(" ")[0],
                            ship_to_last_name: shipment.customer_name.split(" ")[1],
                            ship_to_company: "Customer",
                            ship_to_address_line1: shipment.shipping_address,
                            ship_to_address_line2: shipment.shipping_address_2,
                            ship_to_address_line3: shipment.shipping_address_2,
                            ship_to_zipcode: shipment.shipping_postcode,
                            ship_to_phone: shipment.customer_mobile,
                            ship_to_email: email,
                            package_type: "Package",
                            total_weight: shipment.weight,
                            invoice_value: shipment.cod_amount,
                            invoice_currency: "INR",
                            payment_type: 'Prepaid',
                            goods_general_description: "Shipment Items",
                            goods_value: total_amount.toString(),
                            bill_to: "Shipper",
                            include_insurance: "No",
                            email_notification: "Yes",
                            mobile_notification: "Yes",
                            add_adult_signature: "Yes",
                            cash_on_delivery: "No"
                        },
                        package: []
                    }
                ]
            };
            boxes.map((box, index) => {
                req.payload[0].package.push({
                    "package_unique_id": `PACK_${index + 1}`,
                    "length": box.length,
                    "width": box.breadth,
                    "height": box.length,
                    "weight_actual": parseInt(box.weight) / 1000,
                    "identical_package_count": 1
                })
            })

            const responseDta = await fetch(`https://apim.iristransport.co.in/rest/v2/shipment/sync/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Ocp-Apim-Subscription-Key': process.env.MOVIN_SUBSCRIPTION_KEY
                },
                body: JSON.stringify(reqBody)
            });

            const response = await responseDta.json();
            console.log(response)
            if (response.error) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: response
                });
            }

            const transaction = await db.beginTransaction();
            await transaction.query('UPDATE SHIPMENTS set serviceId = ?, categoryId = ?, awb = ? WHERE ord_id = ?', [serviceId, categoryId, response.response.success[`JUP${refId}`].parent_shipment_number[0], order]);
            await transaction.query('INSERT INTO SHIPMENT_REPORTS VALUES (?,?,?)', [refId, order, "SHIPPED"]);
            if (shipment.pay_method != "topay") {
                await transaction.query('UPDATE WALLET SET balance = balance - ? WHERE uid = ?', [price, id]);
                await transaction.query('INSERT INTO EXPENSES (uid, expense_order, expense_cost) VALUES  (?,?,?)', [id, order, price]);
            }
            await db.commit(transaction);

            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Shipment created successfully',
                text: `Dear Merchant, \nYour shipment request for Order id : ${order} is successfully created at Movin Courier Service 
              and the corresponding charge is deducted from your wallet.\nRegards,\nJupiter Xpress`
            };
            await transporter.sendMail(mailOptions);

            return res.status(200).json({
                status: 200,
                response: response,
                success: true
            });
        }
    }
    catch (err) {
        return res.status(500).json({
            status: 500,
            message: err.message
        });
    }
}

const createInternationalShipment = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const [users] = await db.query('SELECT * FROM USERS u JOIN USER_DATA ud ON u.uid = ud.uid WHERE u.uid =?', [id]);
        const user = users[0]
        const email = user.email;
        const { iid } = req.body;
        if (!iid) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Missing international shipment ID"
            });
        }
        const [shipments] = await db.query('SELECT * FROM INTERNATIONAL_SHIPMENTS WHERE iid = ? ', [iid]);
        const shipment = shipments[0];
        const [dockets] = await db.query('SELECT * FROM DOCKETS WHERE iid = ? ', [iid]);
        const [items] = await db.query('SELECT * FROM DOCKET_ITEMS WHERE iid = ? ', [iid]);
        const [warehouses] = await db.query('SELECT * FROM WAREHOUSES WHERE uid = ? AND wid = ?', [id, shipment.wid]);
        const [key] = await db.query('SELECT FlightGo FROM DYNAMIC_APIS');
        const api_key = key[0].FlightGo
        const warehouse = warehouses[0]
        const params = {
            Bucket: process.env.S3_BUCKET_NAME_,
            Key: user.aadhar_doc,
            Expires: 60 * 60 * 24 * 7,
        };

        let total_amount = 0;
        for (let i = 0; i < items.length; i++) {
            total_amount += (parseFloat(items[i].rate) * parseFloat(items[i].quantity))
        }
        const downloadURL = await s3.getSignedUrlPromise('getObject', params);
        const reqBody = {
            "tracking_no": `JUPINT${iid}`,
            "origin_code": "IN",
            // "customer_id"  : "181",
            "product_code": "NONDOX",
            "destination_code": shipment.consignee_country,
            "booking_date": shipment.invoice_date,
            "booking_time": shipment.invoice_time,
            "pcs": dockets.length,
            "shipment_value": total_amount,
            "shipment_value_currency": "INR",
            "actual_weight": shipment.actual_weight,
            "shipment_invoice_no": `JUPINT${iid}`,
            "shipment_invoice_date": shipment.invoice_date,
            "shipment_content": shipment.contents,
            "free_form_note_master_code": shipment.shippingType,
            "new_docket_free_form_invoice": "1",
            "free_form_currency": "INR",
            "terms_of_trade": "FOB",
            "api_service_code": shipment.service_code,
            "free_form_invoice_type_id": "INVOICE",
            "shipper_name": warehouse.warehouseName,
            "shipper_company_name": user.businessName,
            "shipper_contact_no": user.phone,
            "shipper_email": "xpressjupiter@gmail.com",
            "shipper_address_line_1": warehouse.address,

            "shipper_city": user.city,
            "shipper_state": user.state,
            "shipper_country": "IN",
            "shipper_zip_code": warehouse.pin,
            "shipper_gstin_type": "Aadhaar Number",
            "shipper_gstin_no": user.aadhar_number,
            "consignee_name": shipment.consignee_name,
            "consignee_company_name": shipment.consignee_company_name,
            "consignee_contact_no": shipment.consignee_contact_no,
            "consignee_email": "xpressjupiter@gmail.com",
            "consignee_address_line_1": shipment.consignee_address_1,
            "consignee_address_line_2": shipment.consignee_address_2,
            "consignee_address_line_3": shipment.consignee_address_3,
            "consignee_city": shipment.consignee_city,
            "consignee_state": shipment.consignee_state,
            "consignee_country": shipment.consignee_country,
            "consignee_zip_code": shipment.consignee_zip_code,
            "docket_items": [],
            "free_form_line_items": [],
            "kyc_details": [
                {
                    "document_type": "Aadhaar Number",
                    "document_no": user.aadhar_number,
                    "document_name": "aadhaarDoc",
                    "file_path": downloadURL
                }
            ]
        }
        dockets.map((docket, index) => {
            reqBody.docket_items.push({
                "actual_weight": docket.docket_weight,
                "length": docket.length,
                "width": docket.breadth,
                "height": docket.height,
                "number_of_boxes": "1"
            })
        })
        items.map((item, index) => {
            reqBody.free_form_line_items.push({
                "total": (parseFloat(item.quantity) * parseFloat(item.rate)),
                "no_of_packages": item.quantity,
                "box_no": item.box_no,
                "rate": item.rate,
                "hscode": item.hscode,
                "description": item.description,
                "unit_of_measurement": item.unit,
                "unit_weight": item.unit_weight,
                "igst_amount": item.igst_amount
            })
        })

        const responseDta = await fetch(`https://online.flightgo.in/docket_api/create_docket`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${api_key}`
            },
            body: JSON.stringify(reqBody)
        })
        const response = await responseDta.json()
        if (response.success) {
            const transaction = await db.beginTransaction();
            await transaction.query('UPDATE INTERNATIONAL_SHIPMENTS set serviceId = ?, categoryId = ?, awb = ?,docket_id = ?, status = ? WHERE iid = ?', [1, 1, response.data.awb_no, response.data.docket_id, "MANIFESTED", iid])
            await transaction.query('UPDATE WALLET SET balance = balance - ? WHERE uid = ?', [parseFloat(shipment.shipping_price), id]);
            await transaction.query('INSERT INTO EXPENSES (uid, expense_order, expense_cost) VALUES  (?,?,?)', [id, `JUPINT${iid}`, parseFloat(shipment.shipping_price)])
            await db.commit(transaction);
        }
        else {
            return res.status(400).json({
                status: 400, success: false, response: response, request: reqBody
            });
        }
        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Shipment created successfully',
            text: `Dear Merchant, \nYour shipment request for Order id : JUPINT${iid} and AWB : ${response.data.awb_no} is successfully created at FlightGo Courier Service and the corresponding charge is deducted from your wallet.\nRegards,\nJupiter Xpress`
        };
        await transporter.sendMail(mailOptions)
        return res.status(200).json({
            status: 200, req: req, response: response, success: true, user: user
        });


    }
    catch (error) {
        return res.status(500).json({
            status: 500, response: error, success: false
        });
    }
}

const getAllDomesticShipmentReports = async (req, res) => {
    const token = req.headers.authorization;
    const verified = jwt.verify(token, SECRET_KEY);
    const admin = verified.admin;
    if (!admin) {
        return res.status(400).json({
            status: 400, message: 'Access Denied'
        });
    }
    try {
        const [rows] = await db.query('SELECT * FROM SHIPMENT_REPORTS r JOIN SHIPMENTS s ON r.ord_id=s.ord_id JOIN USERS u ON u.uid=s.uid WHERE r.status != "FAILED"');
        return res.status(200).json({
            status: 200, rows, success: true
        });
    } catch (error) {
        return res.status(500).json({
            status: 500, message: error.message, success: false
        });
    }
}

const getInternationalShipmentReport = async (req, res) => {
    const token = req.headers.authorization;
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id;
    if (!id) {
        return res.status(400).json({
            status: 400, message: 'Access Denied'
        });
    }
    const { awb } = req.body
    if (!awb) {
        return res.status(400).json({
            status: 400, message: 'Awb is required'
        });
    }

    try {

        const response = await fetch(`http://admin.flightgo.in/api/tracking_api/get_tracking_data?api_company_id=24&customer_code=1179&tracking_no=${awb}`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });
        const data = await response.json();
        const status = data[0].docket_info[4][1];
        await db.query('UPDATE INTERNATIONAL_SHIPMENTS set status = ? WHERE awb = ?', [status, awb]);
        const [rows] = await db.query('SELECT * FROM INTERNATIONAL_SHIPMENTS WHERE awb = ?', [awb])
        return res.status(200).json({
            status: 200, data: rows[0], track: data, success: true
        })

    } catch (error) {
        return res.status(500).json({
            status: 500, message: error.message, success: false
        });
    }
}

const getInternationalShipments = async (req, res) => {
    const token = req.headers.authorization;
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const admin = verified.admin;

        try {
            if (admin) {
                const [rows] = await db.query('SELECT * FROM INTERNATIONAL_SHIPMENTS s JOIN WAREHOUSES w ON s.wid=w.wid JOIN USERS u ON u.uid=s.uid WHERE s.awb IS NOT NULL');
                return res.status(200).json({
                    status: 200, success: true, order: rows
                });
            } else {
                const [rows] = await db.query('SELECT * FROM INTERNATIONAL_SHIPMENTS s JOIN WAREHOUSES w ON s.wid=w.wid WHERE s.uid = ? AND s.awb IS NOT NULL', [id]);
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

const getDomesticShipmentReport = async (req, res) => {
    const token = req.headers.authorization;
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id;
    if (!id) {
        return res.status(400).json({
            status: 400, message: 'Access Denied'
        });
    }
    const { ref_id } = req.body
    if (!ref_id) {
        return res.status(400).json({
            status: 400, message: 'Ref_id is required'
        });
    }

    try {
        const [shipments] = await db.query("SELECT * FROM SHIPMENTS s JOIN SHIPMENT_REPORTS r ON s.ord_id = r.ord_id WHERE r.ref_id = ?", [ref_id])
        const shipment = shipments[0]
        const awb = shipment.awb
        const serviceId = shipment.serviceId
        const categoryId = shipment.categoryId
        if (serviceId == 1) {
            const response = await fetch(`https://track.delhivery.com/api/v1/packages/json/?ref_ids=JUP${ref_id}`, {
                headers: {
                    'Authorization': `Token ${categoryId == 2 ? process.env.DELHIVERY_500GM_SURFACE_KEY : process.env.DELHIVERY_10KG_SURFACE_KEY}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            const statusData = data.ShipmentData[0].Shipment;
            const status = statusData.Status.Status
            await db.query('UPDATE SHIPMENT_REPORTS set status = ? WHERE ref_id = ?', [status, ref_id]);
            return res.status(200).json({
                status: 200, data: statusData, success: true
            });
        } else if (serviceId == 2) {
            const loginPayload = {
                grant_type: "client_credentials",
                client_id: process.env.MOVIN_CLIENT_ID,
                client_secret: process.env.MOVIN_CLIENT_SECRET,
                Scope: `${process.env.MOVIN_SERVER_ID}/.default`,
            };
            const formBody = Object.entries(loginPayload).map(
                ([key, value]) =>
                    encodeURIComponent(key) + "=" + encodeURIComponent(value)
            ).join("&");
            const login = await fetch(`https://login.microsoftonline.com/${process.env.MOVIN_TENANT_ID}/oauth2/v2.0/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: formBody
            })
            const loginRes = await login.json()
            const movinToken = loginRes.access_token
            const response4 = await fetch(`https://apim.iristransport.co.in/rest/v2/order/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${movinToken}`,
                    'Ocp-Apim-Subscription-Key': process.env.MOVIN_SUBSCRIPTION_KEY
                },
                body: JSON.stringify({ "tracking_numbers": [awb] }),
            });
            const data4 = await response4.json();
            if (data4.data[awb] != "Tracking number is not valid.") {
                const ResultStatus = [];
                for (const [key, value] of Object.entries(data4.data[awb])) {
                    if (key.startsWith(awb)) {
                        for (let i = 0; i < value.length; i++) {
                            ResultStatus.push(data4.data[awb][key][i])
                        }
                    }
                }
                return res.status(200).json({
                    status: 200, data: ResultStatus, success: true, id: 3
                });
            }
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: 500, message: 'Error retrieving shipment data', error: err.message
        });
    }
}

const getDomesticShipmentReports = async (req, res) => {
    const token = req.headers.authorization;
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id;
    if (!id) {
        return res.status(400).json({
            status: 400, message: 'Access Denied'
        });
    }

    try {
        const [rows] = await db.query('SELECT * FROM SHIPMENT_REPORTS r JOIN SHIPMENTS s ON r.ord_id=s.ord_id WHERE r.status != "FAILED" AND s.uid = ?', [id]);

        return res.status(200).json({
            status: 200, rows, success: true
        });
    } catch (error) {
        return res.status(500).json({
            status: 500, message: error.message, success: false
        });
    }
}

const getDomesticShipmentLabel = async (req, res) => {
    const token = req.headers.authorization;
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id;
    const { order } = req.body;
    const [users] = await db.query('SELECT * FROM USERS WHERE uid =?', [id]);
    const email = users[0].email;
    const [shipments] = await db.query('SELECT * FROM SHIPMENTS WHERE ord_id = ? ', [order]);
    const shipment = shipments[0];
    const { serviceId, categoryId } = shipment;
    // const [orders] = await db.query('SELECT * FROM ORDERS WHERE ord_id = ? ', [order]);
    if (serviceId == 1) {

        const label = await fetch(`https://track.delhivery.com/api/p/packing_slip?wbns=${shipment.awb}&pdf=true`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Token ${categoryId === 2 ? process.env.DELHIVERY_500GM_SURFACE_KEY : categoryId === 1 ? process.env.DELHIVERY_10KG_SURFACE_KEY : categoryId === 3 ? '' : ''}`
            },
        }).then((response) => response.json())

        return res.status(200).json({
            status: 200, label: label.packages[0].pdf_download_link, success: true
        });
    }
    else if (serviceId == 2) {
        const loginPayload = {
            grant_type: "client_credentials",
            client_id: process.env.MOVIN_CLIENT_ID,
            client_secret: process.env.MOVIN_CLIENT_SECRET,
            Scope: `${process.env.MOVIN_SERVER_ID}/.default`,
        };
        const formBody = Object.entries(loginPayload).map(
            ([key, value]) =>
                encodeURIComponent(key) + "=" + encodeURIComponent(value)
        ).join("&");
        const login = await fetch(`https://login.microsoftonline.com/${process.env.MOVIN_TENANT_ID}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            body: formBody
        })
        const loginRes = await login.json()
        const token = loginRes.access_token
        const label = await fetch(`https://apim.iristransport.co.in/rest/v2/shipment/label`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Ocp-Apim-Subscription-Key': process.env.MOVIN_SUBSCRIPTION_KEY,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                "shipment_number": shipment.awb,
                "account_number": process.env.MOVIN_ACCOUNT_NUMBER,
                "scope": "all",
                "label_type": "thermal"
            })
        }).then((response) => response.json())

        return res.status(200).json({
            status: 200, label: label.response, success: true
        });
    }
}

module.exports = {
    cancelShipment,
    createDomesticShipment,
    createInternationalShipment,
    getAllDomesticShipmentReports,
    getInternationalShipmentReport,
    getInternationalShipments,
    getDomesticShipmentReport,
    getDomesticShipmentReports,
    getDomesticShipmentLabel
};

