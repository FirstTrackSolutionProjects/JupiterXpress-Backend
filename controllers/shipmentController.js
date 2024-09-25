const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { transporter } = require('../utils/email');

const SECRET_KEY = process.env.JWT_SECRET;

const cancelShipment = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const { order } = req.body;
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

const createShipment = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const [users] = await db.query('SELECT * FROM USERS WHERE uid =?', [id]);
        const email = users[0].email;
        const { order, price, serviceId, categoryId } = event.body;
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

            const res = await fetch(`https://track.delhivery.com/waybill/api/bulk/json/?count=1`, {
                method: 'GET',
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    'Authorization': `Token ${categoryId === "2" ? process.env.DELHIVERY_500GM_SURFACE_KEY : categoryId === "1" ? process.env.DELHIVERY_10KG_SURFACE_KEY : categoryId === 3 ? '' : ''}`
                }
            });

            const waybill = await res.json();
            let req = {
                shipments: [],
                pickup_location: {
                    name: warehouse.warehouseName,
                    add: warehouse.address,
                    pin_code: warehouse.pin,
                    phone: warehouse.phone,
                }
            };

            req.shipments.push({
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
            formData.append('data', JSON.stringify(req));

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

            // Uncomment the email logic if needed
            // let mailOptions = {
            //   from: process.env.EMAIL_USER,
            //   to: email, 
            //   subject: 'Shipment created successfully',
            //   text: `Dear Merchant, \nYour shipment request for Order id : ${order} is successfully created at Delhivery Courier Service 
            //   and the corresponding charge is deducted from your wallet.\nRegards,\nJupiter Xpress`
            // };
            // await transporter.sendMail(mailOptions);

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
            const req = {
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
                body: JSON.stringify(req)
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

            // Uncomment the email logic if needed
            // let mailOptions = {
            //   from: process.env.EMAIL_USER,
            //   to: email,
            //   subject: 'Shipment created successfully',
            //   text: `Dear Merchant, \nYour shipment request for Order id : ${order} is successfully created at Movin Courier Service 
            //   and the corresponding charge is deducted from your wallet.\nRegards,\nJupiter Xpress`
            // };
            // await transporter.sendMail(mailOptions);

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

module.exports = { cancelShipment, createShipment };

