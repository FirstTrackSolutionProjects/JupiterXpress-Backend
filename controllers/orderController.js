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
                returnres.status(500).json( {
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

module.exports = { createDomesticOrder }