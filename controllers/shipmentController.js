const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { s3 } = require('../utils/aws_s3');
const { transporter } = require('../utils/email');
const { movinPincodes, movinPrices, movinRegion, IndianStateInfo } = require('../data/movin');

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

        let total_weight = 0;
        for (let i = 0; i < boxes.length; i++) {
            total_weight += parseInt(boxes[i].weight)
        }
        const firstNameEndsAt = shipment.customer_name.indexOf(' ');
        const splitNames = firstNameEndsAt !== -1 ? [shipment.customer_name.slice(0, firstNameEndsAt), shipment.customer_name.slice(firstNameEndsAt + 1)] : [shipment.customer_name];
        const customerFirstName = splitNames[0];
        const customerLastName = splitNames.length > 1 ? splitNames[1] : customerFirstName;
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
                await transaction.query('UPDATE SHIPMENTS set serviceId = ?, categoryId = ?, awb = ?, is_manifested = ?, in_process = ? WHERE ord_id = ?', [serviceId, categoryId, response.packages[0].waybill, true, false, order]);
                await transaction.query('INSERT INTO SHIPMENT_REPORTS VALUES (?,?,?)', [refId, order, "SHIPPED"]);
                await transaction.query('INSERT INTO EXPENSES (uid, expense_order, expense_cost) VALUES  (?,?,?)', [id, order, (shipment.pay_method == "topay")?0:price]);
                if (shipment.pay_method != "topay") {
                    await transaction.query('UPDATE WALLET SET balance = balance - ? WHERE uid = ?', [price, id]);
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

            let fromAddressLine1 = warehouse.address.substring(0,50);
            let fromAddressLine2 = warehouse.address.substring(50,100);
            let fromAddressLine3 = warehouse.address.substring(100,150);
            if (fromAddressLine2 == ""){
                fromAddressLine2 = fromAddressLine1;
                fromAddressLine3 = fromAddressLine1;
            } else if (fromAddressLine3 == ""){
                fromAddressLine3 = fromAddressLine1;
            }


            let toAddressLine1 = shipment.shipping_address.substring(0,50);
            let toAddressLine2 = shipment.shipping_address.substring(50,100);
            let toAddressLine3 = shipment.shipping_address.substring(100,150);
            if (toAddressLine2 == ""){
                toAddressLine2 = toAddressLine1;
                toAddressLine3 = toAddressLine1;
            } else if (toAddressLine3 == ""){
                toAddressLine3 = toAddressLine1;
            }


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
                            ship_from_address_line1: fromAddressLine1,
                            ship_from_address_line2: fromAddressLine2,
                            ship_from_address_line3: fromAddressLine3,
                            ship_from_zipcode: warehouse.pin,
                            ship_from_email: "jupiterxpress2024@gmail.com",
                            ship_from_phone: users[0].phone,
                            shipment_date: shipment.pickup_date,
                            shipment_priority: categoryId == 1 ? 'Express End of Day' : 'Standard Premium',
                            ship_to_first_name: customerFirstName,
                            ship_to_last_name: customerLastName,
                            ship_to_company: "Customer",
                            ship_to_address_line1: toAddressLine1,
                            ship_to_address_line2: toAddressLine2,
                            ship_to_address_line3: toAddressLine3,
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
                reqBody.payload[0].package.push({
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
            try {
                if (response.response.errors[0].shipment[`JUP${refId}`][0].error) {
                    return res.status(400).json({
                        status: 400,
                        success: false,
                        message: response.response.errors[0].shipment[`JUP${refId}`][0].error
                    });
                }
            } catch (err) {
                //No error found, so shipment creation can be procedded
            }
            const transaction = await db.beginTransaction();
            try {
                await transaction.query('UPDATE SHIPMENTS set serviceId = ?, categoryId = ?, awb = ?, is_manifested = ?, in_process = ? WHERE ord_id = ?', [serviceId, categoryId, response.response.success[`JUP${refId}`].parent_shipment_number[0], true, false, order]);
                await transaction.query('INSERT INTO SHIPMENT_REPORTS VALUES (?,?,?)', [refId, order, "SHIPPED"]);
                await transaction.query('INSERT INTO EXPENSES (uid, expense_order, expense_cost) VALUES  (?,?,?)', [id, order, (shipment.pay_method == "topay")?0:price]);
                if (shipment.pay_method != "topay") {
                    await transaction.query('UPDATE WALLET SET balance = balance - ? WHERE uid = ?', [price, id]);
                }
                await db.commit(transaction);
            } catch (err) {
                await db.rollback(transaction);
                console.log(err);
                return res.status(500).json({
                    status: 500,
                    response: response,
                    error: err
                });
            }

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
        } else if (serviceId == 3) {
            const shiprocketClientID = process.env.SHIPROCKET_CLIENT_ID;
            const shipRocketLogin = await fetch('https://api-cargo.shiprocket.in/api/token/refresh/', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh: process.env.SHIPROCKET_REFRESH_TOKEN }),
            })

            const shiprocketLoginData = await shipRocketLogin.json()
            const shiprocketAccess = shiprocketLoginData.access

            let fromAddressLine1 = warehouse.address.substring(0,50);
            let fromAddressLine2 = warehouse.address.substring(50,100);
            if (fromAddressLine2 == ""){
                fromAddressLine2 = fromAddressLine1;
            }


            let toAddressLine1 = shipment.shipping_address.substring(0,50);
            let toAddressLine2 = shipment.shipping_address.substring(50,100);
            if (toAddressLine2 == ""){
                toAddressLine2 = toAddressLine1;
            }

            const shiprocketCreateOrderPayload = {
                "no_of_packages": boxes.length,
                "approx_weight": total_weight,
                "is_insured": false,
                "is_to_pay": false,
                "to_pay_amount": null,
                "source_warehouse_name": warehouse.warehouseName,
                "source_address_line1": fromAddressLine1,
                "source_address_line2": fromAddressLine2,
                "source_pincode": warehouse.pin,
                "source_city": warehouse.city,
                "source_state": warehouse.state,
                "sender_contact_person_name": verified.name,
                "sender_contact_person_email": verified.email,
                "sender_contact_person_contact_no": warehouse.phone,
                "destination_warehouse_name": shipment.shipping_city,
                "destination_address_line1": toAddressLine1,
                "destination_address_line2": toAddressLine2,
                "destination_pincode": shipment.shipping_postcode,
                "destination_city": shipment.shipping_city,
                "destination_state": shipment.shipping_state,
                "recipient_contact_person_name": shipment.customer_name,
                "recipient_contact_person_email": shipment.customer_email,
                "recipient_contact_person_contact_no": shipment.customer_mobile,
                "client_id": shiprocketClientID,
                "packaging_unit_details": [],
                "recipient_GST": null,
                "supporting_docs": [],
                "is_cod": shipment.pay_method == "Pre-paid" ? false : true,
                "cod_amount": shipment.cod_amount,
                "mode_name": shipment.shipping_mode == "Surface" ? "surface" : "air"
            }

            boxes.map((box, index) => {
                shiprocketCreateOrderPayload.packaging_unit_details.push({
                    "units": 1,
                    "weight": parseInt(box.weight) / 1000,
                    "length": box.length,
                    "height": box.height,
                    "width": box.breadth,
                    "unit": "cm"
                },)
            })

            const shipRocketCreateOrder = await fetch(`https://api-cargo.shiprocket.in/api/external/order_creation/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${shiprocketAccess}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(shiprocketCreateOrderPayload)
            });

            const shipRocketCreateOrderData = await shipRocketCreateOrder.json();
            const invoiceUrl = process.env.BUCKET_URL + shipment.invoice_url
            if (shipRocketCreateOrderData.success) {
                const shipRocketShipmentCreate = await fetch('https://api-cargo.shiprocket.in/api/order_shipment_association/', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${shiprocketAccess}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        "client_id": shiprocketClientID,
                        "order_id": shipRocketCreateOrderData.order_id,
                        "remarks": "Shipment",
                        "recipient_GST": null,
                        "to_pay_amount": "0",
                        "mode_id": shipRocketCreateOrderData.mode_id,
                        "delivery_partner_id": shipRocketCreateOrderData.delivery_partner_id,
                        "pickup_date_time": `${shipment.pickup_date} ${shipment.pickup_time}`,
                        "eway_bill_no": shipment.ewaybill,
                        "invoice_value": shipment.invoice_amount,
                        "invoice_number": shipment.invoice_number,
                        "invoice_date": shipment.invoice_date,
                        "supporting_docs": [invoiceUrl]
                    })
                })
                const shipRocketShipmentCreateData = await shipRocketShipmentCreate.json();
                if (shipRocketShipmentCreateData.id) {
                    const transaction = await db.beginTransaction();
                    await transaction.query('UPDATE SHIPMENTS set serviceId = ?, categoryId = ?, in_process = ?, is_manifested = ?, shipping_vendor_reference_id = ? WHERE ord_id = ?', [serviceId, categoryId, true, true, shipRocketShipmentCreateData.id, order])
                    await transaction.query('INSERT INTO SHIPMENT_REPORTS VALUES (?,?,?)', [refId, order, "MANIFESTED"])
                    await transaction.query('INSERT INTO EXPENSES (uid, expense_order, expense_cost) VALUES  (?,?,?)', [id, order, (shipment.pay_method == "topay")?0:price]);
                    if (shipment.pay_method != "topay") {
                        await transaction.query('UPDATE WALLET SET balance = balance - ? WHERE uid = ?', [price, id]);
                    }
                    await db.commit(transaction);
                    let mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: email,
                        subject: 'Shipment created successfully',
                        text: `Dear Merchant, \nYour shipment request for Order id : ${order} is successfully created at Smart Cargo Courier Service and the corresponding charge is deducted from your wallet.\nRegards,\nJupiter Xpress`
                    };
                    await transporter.sendMail(mailOptions)
                    return res.status(200).json({
                        status: 200, response: shipRocketShipmentCreateData, res2: shipRocketCreateOrderData, success: true
                    })
                }
                return res.status(400).json({
                    status: 400, success: false, response: shipRocketShipmentCreateData, res2: shipRocketCreateOrderData, message:  shipRocketShipmentCreateData.non_field_errors[0] || "Unexpected error encountered while creating shipment"
                })
            }
            return res.status(500).json({
                status: 500, success: false, shipRocketCreateOrderData, message: "Unexpected error encountered while creating shipment"
            })
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
            status: 200, req: reqBody, response: response, success: true, user: user
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
                const latestLocation = data4.data[awb].current_branch;
                return res.status(200).json({
                    status: 200, data: { scans: ResultStatus, latestLocation }, data4: data4, success: true, id: 3
                });
            }
        } else if (serviceId == 3) {
            const shipRocketLogin = await fetch('https://api-cargo.shiprocket.in/api/token/refresh/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh: process.env.SHIPROCKET_REFRESH_TOKEN }),
            })
            const shiprocketLoginData = await shipRocketLogin.json()
            const shiprocketAccess = shiprocketLoginData.access
            const shipRocketTrack = await fetch(`https://api-cargo.shiprocket.in/api/shipment/track/${awb}/`, {
                headers: {
                    'Authorization': `Bearer ${shiprocketAccess}`,
                    'Accept': 'application/json'
                }
            })
            const shiprocketTrackData = await shipRocketTrack.json()
            if (shiprocketTrackData.id) {
                return res.status(200).json({
                    status: 200,
                    data: shiprocketTrackData.status_history, success: true, id: 4,
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
    } else if (serviceId == 3) {
        const shipRocketLogin = await fetch('https://api-cargo.shiprocket.in/api/token/refresh/', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: process.env.SHIPROCKET_REFRESH_TOKEN }),
        })
        const shiprocketLoginData = await shipRocketLogin.json()
        const shiprocketAccess = shiprocketLoginData.access
        const vendorRefId = shipment.shipping_vendor_reference_id;
        const getShipmentStatus = await fetch(`https://api-cargo.shiprocket.in/api/external/get_shipment/${vendorRefId}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${shiprocketAccess}`,
                'Content-Type': 'application/json'
            },
        });

        const getShipmentStatusData = await getShipmentStatus.json();

        const label = getShipmentStatusData.label_url
        return res.status(200).json({
            status: 200,
            label: label, success: true
        });
    }
}

const getDomesticShipmentPricing = async (req, res) => {
    const { method, status, origin, dest, weight, payMode, codAmount, volume, quantity, boxes, isShipment, isB2B, invoiceAmount } = req.body
    if (!method || !origin || !dest || !weight || !payMode || !codAmount || !volume || !quantity || !status) {
        return res.status(400).json({
            status: 400, message: 'Missing required fields'
        });
    }

    try {
        const deliveryVolumetric = parseFloat(volume) / 5;
        const netWeight = (Math.max(deliveryVolumetric, weight)).toString()
        let responses = []

        const delhivery500gmPricing = async () => {
            if (isShipment && isB2B) return;
            const response = await fetch(`https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=${method}&ss=${status}&d_pin=${dest}&o_pin=${origin}&cgm=${netWeight}&pt=${payMode}&cod=${codAmount}`, {
                headers: {
                    'Authorization': `Token ${process.env.DELHIVERY_500GM_SURFACE_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': '*/*'
                }
            });
            const data = await response.json();
            const price = data[0]['total_amount']
            if (quantity == 1) {
                responses.push({
                    "name": `Delhivery ${method == 'S' ? 'Surface' : 'Express'} Light`,
                    "weight": "500gm",
                    "price": Math.round(price * 1.3),
                    "serviceId": "1",
                    "categoryId": "2",
                    "chargableWeight": netWeight
                })
            }
        }

        const delhivery10kgPricing = async () => {
            if (isShipment && isB2B) return;
            const response2 = await fetch(`https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=${method}&ss=${status}&d_pin=${dest}&o_pin=${origin}&cgm=${netWeight}&pt=${payMode}&cod=${codAmount}`, {
                headers: {
                    'Authorization': `Token ${process.env.DELHIVERY_10KG_SURFACE_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': '*/*'
                }
            })
            const data2 = await response2.json();
            const price2 = data2[0]['total_amount']
            if (quantity == 1) {
                if (method == 'S') {
                    responses.push({
                        "name": `Delhivery Surface`,
                        "weight": "10Kg",
                        "price": Math.round(price2 * 1.3),
                        "serviceId": "1",
                        "categoryId": "1",
                        "chargableWeight": netWeight

                    })
                }
            }
        }

        const movinPricing = async () => {
            let movinSurfaceActive = false;
            let movinExpressActive = false;
            if (movinPincodes[origin] && movinPincodes[dest]) {
                if (movinPincodes[origin]["Surface"] == "active" && movinPincodes[dest]["Surface"] == "active") {
                    movinSurfaceActive = true;
                }
                if (movinPincodes[origin]["Express"] == "active" && movinPincodes[dest]["Express"] == "active") {
                    movinExpressActive = true;
                }
            }
            const movinVolumetric = parseFloat(volume) / (method == "S" ? 4.5 : 5)
            const movinNetWeight = (Math.max(method == "S" ? 10000 : 5000, Math.max(movinVolumetric, weight))).toString()
            const originData = await fetch(`http://www.postalpincode.in/api/pincode/${origin}`)
            const destData = await fetch(`http://www.postalpincode.in/api/pincode/${dest}`)
            const originPSData = await originData.json()
            const destPSData = await destData.json()
            const originState = originPSData.PostOffice[0].State;
            const destState = destPSData.PostOffice[0].State;
            let i = 0;
            for (i = 0; i < movinRegion.length; i++) {
                if ((movinRegion[i].toLowerCase()).includes((originState.toLowerCase()))) {
                    break;
                }
            }
            let j = 0;
            for (j = 0; j < movinRegion.length; j++) {
                if ((movinRegion[j].toLowerCase()).includes((destState.toLowerCase()))) {
                    break;
                }
            }
            let movinPrice = parseFloat(movinPrices[method][i][j]) * parseFloat(movinNetWeight) / 1000;
            movinPrice = movinPrice * 1.1010;
            movinPrice = movinPrice + 30;
            movinPrice = movinPrice * 1.18;
            movinPrice = movinPrice * (method == "E" ? 1.4 : 1.4);


            if (method == 'S' && movinSurfaceActive) {
                responses.push({
                    "name": `Movin Surface`,
                    "weight": `Min. 10Kg`,
                    "price": Math.round(parseFloat(movinPrice)),
                    "serviceId": "2",
                    "categoryId": "2",
                    "chargableWeight": movinNetWeight
                })
            }
            if (method == 'E' && movinExpressActive) {
                responses.push({
                    "name": `Movin Express`,
                    "weight": `Min. 5Kg`,
                    "price": Math.round(parseFloat(movinPrice)),
                    "serviceId": "2",
                    "categoryId": "1",
                    "chargableWeight": movinNetWeight
                })
            }
        }

        const pickrr20kgPricing = async () => {
            if (isShipment && !isB2B) return;
            const shipRocketLogin = await fetch('https://api-cargo.shiprocket.in/api/token/refresh/', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh: process.env.SHIPROCKET_REFRESH_TOKEN }),
            })
            const shiprocketLoginData = await shipRocketLogin.json()
            const shiprocketAccess = shiprocketLoginData.access
            const shipRocketPriceBody = {
                "from_pincode": origin,
                "from_city": "Mumbai",
                "from_state": "Maharashtra",
                "to_pincode": dest,
                "to_city": "New Delhi",
                "to_state": "Delhi",
                "quantity": quantity,
                "invoice_value": 1111,
                "calculator_page": "true",
                "packaging_unit_details": []
            }
            boxes.map((box, index) => {
                shipRocketPriceBody.packaging_unit_details.push({
                    "units": 1,
                    "length": box.length,
                    "height": box.height,
                    "weight": parseInt(box.weight) / 1000,
                    "width": box.breadth,
                    "unit": "cm"
                })
            })
            const shipRocketPrice = await fetch(`https://api-cargo.shiprocket.in/api/shipment/charges/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${shiprocketAccess}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(shipRocketPriceBody)
            })
            const shiprocketPriceData = await shipRocketPrice.json()
            for (const service in shiprocketPriceData) {
                if (method == 'S' && service.endsWith('-surface')) {
                    responses.push({
                        "name": service,
                        "weight": "20Kg",
                        "price": Math.round(((parseFloat(shiprocketPriceData[service].working.grand_total) * 1.3))+((invoiceAmount)?(Math.max(75,(0.002*invoiceAmount))):0)),
                        "serviceId": "3",
                        "categoryId": "1",
                        "chargableWeight": shiprocketPriceData[service].working.chargeable_weight*1000
                    })
                } else if (method == 'E' && service.endsWith('-air')) {
                    responses.push({
                        "name": service,
                        "weight": "20Kg",
                        "price": Math.round(parseFloat(shiprocketPriceData[service].working.grand_total) * 1.3),
                        "serviceId": "3",
                        "categoryId": "1",
                        "chargableWeight": shiprocketPriceData[service].working.chargeable_weight*1000
                    })
                }
            }
        }

        await Promise.all([
            delhivery500gmPricing(),
            delhivery10kgPricing(),
            movinPricing(),
            pickrr20kgPricing(),
        ])


        return res.status(200).json({
            status: 200, prices: responses
        });
    } catch (error) {
        return res.status(500).json({
            status: 500, error: 'Failed to fetch data' + error
        });
    }
}

const internationalShipmentPricingInquiry = async (req, res) => {
    const { originCountry,
        origin,
        destCountry,
        dest,
        weight,
        payMode,
        length,
        breadth,
        height,
        name,
        phone,
        email, } = req.body;

    try {
        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: `${process.env.EMAIL_USER},${process.env.CONTACT_EMAIL}`,
            subject: "Inquiry : International Pricing",
            text: `Dear Owner,\nA merchant has submitted a inquiry for the International Pricing.\nHere are the following details,\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nOrigin Country: ${originCountry}\nOrigin Pin : ${origin}\nDestination Country: ${destCountry}\nDestination Pin : ${dest}\nPayment Mode : ${payMode}\nWeight : ${weight}\nLength : ${length}\nBreadth : ${breadth}\nHeight : ${height}\n\nRegards,\nJupiter Xpress`,
        };
        await transporter.sendMail(mailOptions);
        return res.status(200).json({
            status: 200, success: true, message: "Request Submitted Succesfully"
        });
    } catch (error) {
        return res.status(500).json({
            status: 500, message: "Something went wrong, please try again", error: error.message
        });
    }
}

const domesticShipmentPickupSchedule = async (req, res) => {

    const token = req.headers.authorization;
    const verified = jwt.verify(token, SECRET_KEY);
    const id = verified.id;
    const { wid, pickTime, pickDate, packages, serviceId } = req.body;
    if (!wid || !packages || !serviceId || !pickDate || !pickTime) {
        return res.status(400).json({
            status: 400, error: 'Missing required fields'
        });
    }
    const [warehouses] = await db.query('SELECT * FROM WAREHOUSES WHERE uid = ? AND wid = ?', [id, wid]);
    const [users] = await db.query('SELECT * FROM USERS WHERE uid = ?', [id])
    const user = users[0]
    const warehouse = warehouses[0]
    // const [orders] = await db.query('SELECT * FROM ORDERS WHERE ord_id = ? ', [order]);

    if (serviceId[0] == 1) {
        const schedule = await fetch(`https://track.delhivery.com/fm/request/new/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Token ${serviceId[1] == 1 ? process.env.DELHIVERY_10KG_SURFACE_KEY : process.env.DELHIVERY_500GM_SURFACE_KEY}`
            },
            body: JSON.stringify({ pickup_location: warehouse.warehouseName, pickup_time: pickTime, pickup_date: pickDate, expected_package_count: packages })
        })
        const scheduleData = await schedule.json()
        if (scheduleData.incoming_center_name) {
            return res.status(200).json({
                status: 200, schedule: "Pickup request sent successfully", success: true
            });
        }
        else if (scheduleData.prepaid) {
            return res.status(200).json({
                status: 200, schedule: "Pickup request failed due to low balance of owner", success: true
            });
        }
        else if (scheduleData.pr_exist) {
            return res.status(200).json({
                status: 200, schedule: "This time slot is already booked", success: true
            });
        }
        else {
            return res.status(200).json({
                status: 200, schedule: "Please enter a valid date and time in future", success: false
            });
        }



    } else if (serviceId[0] == 2) {
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
        const pickupLocReq = await fetch(`http://www.postalpincode.in/api/pincode/${warehouse.pin}`)
        const pickupLocRes = await pickupLocReq.json()
        const pickupCity = pickupLocRes.PostOffice[0].District
        const pickupState = IndianStateInfo[pickupLocRes.PostOffice[0].State]
        const schedulePayload = {
            "account": process.env.MOVIN_ACCOUNT_NUMBER,
            "pickup_date": pickDate,
            "pickup_time_start": pickTime,
            "service_type": serviceId[1] == 1 ? "Standard Premium" : "Express End of Day",
            "address_first_name": warehouse.warehouseName,
            "address_last_name": "Warehouse",
            "address_email": "xpressjupiter@gmail.com",
            "address_phone": user.phone,
            "address_address_line1": warehouse.address,
            "address_address_line2": warehouse.address,
            "address_address_line3": warehouse.address,
            "address_zipcode": warehouse.pin,
            "address_city": pickupCity,
            "address_state": pickupState.state_code,
            "pickup_reason": "Parcel Pickup"
        }
        const schedule = await fetch(`https://apim.iristransport.co.in/rest/v2/pickup/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Ocp-Apim-Subscription-Key': process.env.MOVIN_SUBSCRIPTION_KEY,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(schedulePayload)
        }).then((response) => response.json())
        if (schedule.status == 200) {
            return res.status(200).json({
                status: 200, schedule: "Pickup request sent successfully", success: true
            });
        }
        else if (schedule.response.errors.pickup_date) {
            return res.status(200).json({
                status: 200, schedule: schedule.response.errors.pickup_date[0].error, success: false
            });
        }
        else if (schedule.response.errors.pickup_time_start_hour) {
            return res.status(200).json({
                status: 200, schedule: schedule.response.errors.pickup_time_start_hour[0].error, success: false
            });
        }
        else if (schedule.response.errors.zipcode) {
            return res.status(200).json({
                status: 200, schedule: schedule.response.errors.zipcode[0].error, success: false
            });
        }
        else if (schedule.response.errors.service_type) {
            return res.status(200).json({
                status: 200, schedule: schedule.response.errors.service_type[0].error, success: false
            });
        }
        else {
            return res.status(200).json({
                status: 200, schedule: schedule, success: false
            });
        }
    }
    else {
        return res.status(200).json({
            status: 200, schedule: "Invalid service ID", success: false
        })
    }
}

const trackShipment = async (req, res) => {
    const { awb } = req.body;
    const response1 = await fetch(`https://track.delhivery.com/api/v1/packages/json/?waybill=${awb}`, {
        headers: {
            'Authorization': `Token ${process.env.DELHIVERY_500GM_SURFACE_KEY}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
    });

    const data1 = await response1.json();

    if (data1.ShipmentData) {
        return res.status(200).json({
            status: 200, data: data1, success: true, id: 1
        });
    }

    const response2 = await fetch(`https://track.delhivery.com/api/v1/packages/json/?waybill=${awb}`, {
        headers: {
            'Authorization': `Token ${process.env.DELHIVERY_10KG_SURFACE_KEY}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
    });

    const data2 = await response2.json();

    if (data2.ShipmentData) {
        return res.status(200).json({
            status: 200, data: data2, success: true, id: 1
        });
    }

    const shipRocketLogin = await fetch('https://api-cargo.shiprocket.in/api/token/refresh/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: process.env.SHIPROCKET_REFRESH_TOKEN }),
    })
    const shiprocketLoginData = await shipRocketLogin.json()
    const shiprocketAccess = shiprocketLoginData.access
    const shipRocketTrack = await fetch(`https://api-cargo.shiprocket.in/api/shipment/track/${awb}/`, {
        headers: {
            'Authorization': `Bearer ${shiprocketAccess}`,
            'Accept': 'application/json'
        }
    })
    const shiprocketTrackData = await shipRocketTrack.json()
    if (shiprocketTrackData.id) {
        return res.status(200).json({
            status: 200,
            data: shiprocketTrackData.status_history, success: true, id: 4,
        });
    }

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

    try {
        const response3 = await fetch(`http://admin.flightgo.in/api/tracking_api/get_tracking_data?api_company_id=24&customer_code=1179&tracking_no=${awb}`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });
        const data3 = await response3.json();
        if (data3.length) {
            if (!data3[0].errors) {
                return res.status(200).json({
                    status: 200, data: data3[0], success: true, id: 2
                });
            }
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: 500, message: "Error fetching tracking data", success: false
        });
    }
    return res.status(404).json({
        status: 404, message: "Service not found"
    });
}

const updateDomesticProcessingShipments = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401,
            message: 'Access Denied'
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        if (!id) {
            return res.status(400).json({
                status: 400,
                message: 'Invalid token'
            });
        }
        const { ord_id } = req.body;
        if (!ord_id) {
            return res.status(400).json({
                status: 400,
                message: 'Order id is required'
            });
        }
        try {
            const [orders] = await db.query('SELECT * FROM SHIPMENTS WHERE ord_id = ?  AND in_process = true', [ord_id]);
            if (!orders.length) {
                return res.status(400).json({
                    status: 400,
                    message: 'Order is already processed'
                });
            }
            const order = orders[0];
            const serviceId = order.serviceId;
            const categoryId = order.categoryId;
            const vendorRefId = order.shipping_vendor_reference_id;
            if (serviceId == 3) {
                const shipRocketLogin = await fetch('https://api-cargo.shiprocket.in/api/token/refresh/', {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ refresh: process.env.SHIPROCKET_REFRESH_TOKEN }),
                })
                const shiprocketLoginData = await shipRocketLogin.json()
                const shiprocketAccess = shiprocketLoginData.access
                const getShipmentStatus = await fetch(`https://api-cargo.shiprocket.in/api/external/get_shipment/${vendorRefId}/`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${shiprocketAccess}`,
                        'Content-Type': 'application/json'
                    },
                });
                const getShipmentStatusData = await getShipmentStatus.json();
                if (getShipmentStatusData.waybill_no) {
                    await db.query('UPDATE SHIPMENTS SET awb = ?, in_process = ? WHERE ord_id = ?', [getShipmentStatusData.waybill_no, false, ord_id]);
                    return res.status(200).json({ status: 200, success: true, message: 'Shipment processed successfully', awb: getShipmentStatusData.waybill_no });
                } else {
                    return res.status(200).json({ status: 200, success: false, message: 'Shipment is still under process' });
                }
            } else {
                return res.status(404).json({ status: 404, message: 'Service not found' });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({
                status: 500,
                message: 'Internal Server Error'
            });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: 500,
            message: 'Internal Server Error'
        });
    }
}

const getAllDomesticShipmentReportsData = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401,
            message: 'Access Denied'
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        if (!admin) {
            return res.status(401).json({
                status: 401,
                message: 'Unauthorized!'
            });
        }
        const { startDate, endDate } = req.body;
        if (!startDate ||!endDate) {
            return res.status(400).json({
                status: 400,
                message: 'Start date and end date are required'
            });
        }
        const [reportData] = await db.query(`SELECT 
                                            s.ord_id AS ORDER_ID,
                                            e.date AS ORDER_SHIPMENT_DATE,
                                            s.cancelled AS IS_ORDER_CANCELLED,
                                            u.uid AS MERCHANT_ID,
                                            u.businessName AS MERCHANT_BUSINESS_NAME, 
                                            u.email AS MERCHANT_EMAIL, 
                                            u.phone AS MERCHANT_PHONE_NUMBER, 
                                            w.warehouseName AS SHIPPER_WAREHOUSE_NAME, 
                                            w.address AS SHIPPER_WAREHOUSE_ADDRESS, 
                                            w.pin AS SHIPPER_WAREHOUSE_PIN, 
                                            w.city AS SHIPPER_WAREHOUSE_CITY, 
                                            w.state AS SHIPPER_WAREHOUSE_STATE, 
                                            w.country AS SHIPPER_WAREHOUSE_COUNTRY,
                                            s.pay_method AS SHIPMENT_PAYMENT_METHOD,
                                            s.customer_name AS CUSTOMER_NAME,
                                            s.customer_mobile AS CUSTOMER_CONTACT, 
                                            s.customer_email AS CUSTOMER_EMAIL, 
                                            s.shipping_address AS SHIPPING_ADDRESS, 
                                            s.shipping_postcode AS SHIPPING_PINCODE,
                                            s.shipping_city AS SHIPPING_CITY,
                                            s.shipping_state AS SHIPPING_STATE, 
                                            s.shipping_country AS SHIPPING_COUNTRY,
                                            s.same AS SHIPPING_IS_BILLING,
                                            s.billing_address AS BILLING_ADDRESS,
                                            s.billing_postcode AS BILLING_PINCODE, 
                                            s.billing_city AS BILLING_CITY, 
                                            s.billing_state AS BILLING_STATE, 
                                            s.billing_country AS BILLING_COUNTRY,
                                            s.awb AS AWB,
                                            s.ewaybill AS EWAYBILL
                                            FROM SHIPMENTS s
                                            JOIN EXPENSES e ON e.expense_order = s.ord_id
                                            JOIN USERS u ON u.uid = s.uid 
                                            JOIN WAREHOUSES w ON w.wid = s.wid 
                                            WHERE
                                            s.is_manifested = true AND 
                                            e.date BETWEEN ? AND ?`, [startDate+'T00:00:00',endDate+'T23:59:59'])
        return res.status(200).json({ status: 200, data: reportData, success: true });
    }
    catch (err){
        console.error(err)
        return res.status(500).json({
            status: 500,
            message: 'Internal Server Error'
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
    getDomesticShipmentLabel,
    getDomesticShipmentPricing,
    internationalShipmentPricingInquiry,
    domesticShipmentPickupSchedule,
    trackShipment,
    updateDomesticProcessingShipments,
    getAllDomesticShipmentReportsData
};

