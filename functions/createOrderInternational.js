const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// Secret key for JWT
const SECRET_KEY = process.env.JWT_SECRET;

exports.handler = async (event) => {
  const token = event.headers.Authorization;
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
      } = event.body;
      const connection = await mysql.createConnection(dbConfig);

      try {
        await connection.beginTransaction();
        const [shipment] = await connection.execute(
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
          const [docket] =  await connection.execute(
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
          const docketItems = items.filter(item => item.box_no == i+1)
          for (let j = 0; j < docketItems.length; j++) {
            await connection.execute(
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
        await connection.commit();
        return {
          status:200, success: true, message: "Order Created" 
        };
      } catch (error) {
        return {
            status : 504,
            message: error.message + id,
            error: error.message
        };
      } finally {
        await connection.end();
      }
    } catch (err) {
      return {
        status:400, message: "Something went wrong" 
      };
    }
  } catch (err) {
    return {
      status:400, message: "Invalid Token" 
    };
  }
};
