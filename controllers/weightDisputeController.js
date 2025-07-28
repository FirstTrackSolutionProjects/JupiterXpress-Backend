const { transporter } = require('../utils/email');
const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const SECRET_KEY = process.env.JWT_SECRET;

const createDispute = async (req, res) => {
    const token = req.headers.authorization;
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        if (!admin){
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { ord_id, dispute_deduction, dispute_boxes, dispute_doc1, dispute_doc2, dispute_doc3, dispute_doc_4 } = req.body;
        if (!ord_id || !dispute_deduction || !((dispute_boxes instanceof Array) && dispute_boxes?.length )) {
            return res.status(400).json({ message: 'Invalid request' });
        }
        const transaction = await db.beginTransaction();
        const [dispute] = await transaction.query(`INSERT INTO WEIGHT_DISPUTES (ord_id, dispute_deduction, doc_1, doc_2, doc_3, doc_4) VALUES (?,?,?,?,?,?)`,[ord_id, dispute_deduction, dispute_doc1, dispute_doc2, dispute_doc3, dispute_doc_4]);
        const dispute_id = dispute?.insertId;
        await Promise.all(dispute_boxes.map(async (box) => {
            await transaction.query(
              `INSERT INTO WEIGHT_DISPUTE_BOXES (
                dispute_id, 
                box_no,
                length,
                breadth,
                height,
                weight,
                weight_unit,
                actual_length,
                actual_breadth,
                actual_height,
                actual_weight,
                actual_weight_unit
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                dispute_id,
                box?.box_no,
                box?.length,
                box?.breadth,
                box?.height,
                box?.weight,
                box?.weight_unit,
                box?.actual_length,
                box?.actual_breadth,
                box?.actual_height,
                box?.actual_weight,
                box?.actual_weight_unit
              ]
            );
        }));
        
        const [disputed_users] = await transaction.query(`SELECT 
                                                            u.uid AS uid,
                                                            u.email AS email,
                                                            u.businessName AS businessName
                                                            FROM USERS u
                                                            JOIN SHIPMENTS s ON u.uid = s.uid
                                                            WHERE s.ord_id = ?`, [ord_id]);
        if (!disputed_users?.length) {
            return res.status(404).json({ message: 'No users found for the order' });
        }
        const disputed_user = disputed_users[0];
        const disputed_user_id = disputed_user?.uid;
        await transaction.query(`INSERT INTO DISPUTE_CHARGES (uid, dispute_order, dispute_charge) VALUES (?,?,?)`,[disputed_user_id, ord_id, dispute_deduction])
        await transaction.commit();
        const disputed_user_email = disputed_user?.email;
        const disputed_user_business_name = disputed_user?.businessName;
        
        try{
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: `${disputed_user_email},${process.env.EMAIL_USER}`,
                subject: `Weight Dispute For Order ${ord_id}`,
                text: `Dear ${disputed_user_business_name}, \nWe have received weight dispute regarding the order ${ord_id} for the amount of ₹${dispute_deduction}. For more details, Login to your Jupiter Xpress Panel. \n\n Regards, \nJupiter Xpress`
            };
            await transporter.sendMail(mailOptions);
        } catch (err) {
            console.log(err);
        }

        return res.status(200).json({
            success: true,
            message: 'Weight dispute resolved successfully'
        })

    } catch (err) {
        return res.status(500).json({ message: err.message || 'Something Went Wrong!' });
    }
}

const getAllDisputes = async (req, res) => {
    const token = req.headers.authorization;
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;

        if (!admin){
            const id = verified?.id;
            const [disputes] = await db.query(`SELECT wd.* FROM WEIGHT_DISPUTES wd
                                            JOIN SHIPMENTS s ON wd.ord_id = s.ord_id
                                            JOIN USERS u ON u.uid = s.uid
                                            WHERE u.uid = ?`,[id]);

            return res.status(200).json({
                success: true,
                data: disputes,
                message: 'Weight disputes retrieved successfully'
            })
        }

        const [disputes] = await db.query(`SELECT * FROM WEIGHT_DISPUTES`);

        return res.status(200).json({
            success: true,
            data: disputes,
            message: 'All weight disputes retrieved successfully'
        })

    } catch (err) {
        return res.status(500).json({
            message: err.message || 'Something Went Wrong!' ,
        })
    }
}

const getWeightDisputeInfo = async (req, res) => {
    const token = req.headers.authorization;
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const {dispute_id} = req.params;
        const admin = verified.admin;
        if (admin){
            const [disputes] = await db.query(`SELECT * FROM WEIGHT_DISPUTES WHERE dispute_id = ?`,[dispute_id]);

            if (!disputes.length){
                return res.status(404).json({ message: 'Dispute not found' });
            }

            const dispute = disputes[0];

            const [dispute_boxes] = await db.query(`SELECT * FROM WEIGHT_DISPUTE_BOXES WHERE dispute_id = ?`,[dispute_id]);

            const dispute_info = {
                dispute_id: dispute.dispute_id,
                dispute_deduction: dispute.dispute_deduction,
                ord_id: dispute.ord_id,
                dispute_boxes: dispute_boxes,
            }

            return res.status(200).json({
                success: true,
                data: dispute_info,
                message: 'Weight disputes info retrieved successfully'
            })
        } else {
            const id = verified?.id;

            
            const [disputes] = await db.query(`SELECT wd.* FROM WEIGHT_DISPUTES wd
                                                JOIN SHIPMENTS s ON wd.ord_id = s.ord_id
                                                JOIN USERS u ON u.uid = s.uid
                                                WHERE u.uid = ? AND wd.dispute_id = ?`,[id, dispute_id]);
            
            if (!disputes.length){
                return res.status(404).json({ message: 'Dispute not found' });
            }

            const dispute = disputes[0];

            const [dispute_boxes] = await db.query(`SELECT * FROM WEIGHT_DISPUTE_BOXES WHERE dispute_id = ?`,[dispute_id]);

            const dispute_info = {
                dispute_id: dispute.dispute_id,
                dispute_deduction: dispute.dispute_deduction,
                ord_id: dispute.ord_id,
                dispute_boxes: dispute_boxes,
            }

            return res.status(200).json({
                success: true,
                data: dispute_info,
                message: 'Weight dispute info retrieved successfully'
            })
        }
    } catch (err) {
        return res.status(500).json({
            message: err.message || 'Something Went Wrong!' ,
        })
    }
}

module.exports = {
    createDispute,
    getAllDisputes,
    getWeightDisputeInfo
}