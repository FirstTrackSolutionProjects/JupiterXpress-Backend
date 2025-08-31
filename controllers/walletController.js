const Razorpay = require('razorpay');
const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const crypto = require('crypto');
const { transporter } = require('../utils/email');

const SECRET_KEY = process.env.JWT_SECRET;

const createRazorpayOrderId = async (req, res) => {
    const { amount } = req.body;
    if (!amount) {
        return res.status(400).json({ message: 'Amount is required' });
    }
    if (amount < 1) {
        return res.status(400).json({ message: 'Amount should be greater than or equal to 1' });
    }
    const razorpay = new Razorpay({
        key_id: "rzp_live_bUjlhO5HTl10ug",
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
        amount: amount * 100, // Amount in paise
        currency: 'INR',
    };

    try {
        const order = await razorpay.orders.create(options);
        return res.status(200).json(order);
    } catch (error) {
        return res.status(500).json({
            status: 500, error: error.message
        });
    }
}

const getAllRechargeTransactions = async (req, res) => {
    const token = req.headers.authorization;

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const admin = verified.admin;
        if (!admin) {
            const [rows] = await db.query('SELECT * FROM RECHARGE WHERE uid = ?', [id]);
            return res.status(200).json({
                status: 200, success: true, data: rows
            });
        }
        const [rows] = await db.query('SELECT * FROM RECHARGE r JOIN USERS u ON r.uid=u.uid');
        return res.status(200).json({
            status: 200, success: true, data: rows
        });
    } catch (error) {
        return res.status(500).json({
            status: 500, message: 'Unexpected Error while fetching transactions', error: error.message
        });
    }
}

const getAllDisputeChargesTransactions = async (req, res) => {
    const token = req.headers.authorization;

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const admin = verified.admin;
        if (!admin) {
            const [rows] = await db.query('SELECT dc.*, sv.service_name AS service_name FROM DISPUTE_CHARGES dc JOIN SHIPMENTS s ON dc.dispute_order = s.ord_id JOIN SERVICES sv ON s.serviceId = sv.service_id WHERE dc.uid = ?', [id]);
            return res.status(200).json({
                status: 200, success: true, data: rows
            });
        }
        const [rows] = await db.query('SELECT dc.*, sv.service_name AS service_name FROM DISPUTE_CHARGES dc JOIN USERS u ON dc.uid=u.uid JOIN SHIPMENTS s ON dc.dispute_order = s.ord_id JOIN SERVICES sv ON s.serviceId = sv.service_id');
        return res.status(200).json({
            status: 200, success: true, data: rows
        });
    } catch (error) {
        return res.status(500).json({
            status: 500, message: 'Unexpected Error while fetching transactions', error: error.message
        });
    }
}

const getBalance = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return {
            status: 401, message: "Access Denied"
        };
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        if (!id) {
            return res.status(400).json({
                status: 400, message: 'Invalid User'
            });
        }

        try {
            const [rows] = await db.query('SELECT * FROM WALLET WHERE uid = ?', [id]);

            if (rows.length === 0) {
                return {
                    status: 404, error: 'User not found'
                };
            }

            const balance = rows[0].balance;

            return res.status(200).json({
                status: 200, balance
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

const getAllExpenseTransactions = async (req, res) => {
    const token = req.headers.authorization;

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const admin = verified.admin;
        if (admin) {
            const [rows] = await db.query(`
            SELECT e.*, u.fullName, u.businessName, sv.service_name AS service_name, NULL AS vendor_name, s.is_b2b AS is_b2b
            FROM EXPENSES e
            JOIN USERS u ON e.uid = u.uid
            JOIN SHIPMENTS s ON e.expense_order = s.ord_id
            JOIN SERVICES sv ON s.serviceId = sv.service_id

            UNION ALL

            SELECT e.*, u.fullName, u.businessName,  sv.service_name AS service_name, svv.vendor_name AS vendor_name, NULL AS is_b2b
            FROM EXPENSES e
            JOIN USERS u ON e.uid = u.uid
            JOIN INTERNATIONAL_SHIPMENTS s ON e.expense_order = s.iid
            JOIN SERVICES sv ON s.service = sv.service_id
            JOIN SERVICE_VENDORS svv ON s.vendor = svv.id

            ORDER BY date DESC
          `);
            return res.status(200).json({
                status: 200, success: true, data: rows
            });
        }
        const [rows] = await db.query(`
          SELECT e.*, sv.service_name AS service_name, NULL AS vendor_name, s.is_b2b AS is_b2b
          FROM EXPENSES e
          JOIN SHIPMENTS s ON e.expense_order = s.ord_id
          JOIN SERVICES sv ON s.serviceId = sv.service_id
          WHERE e.uid = ?

          UNION ALL

          SELECT e.*, sv.service_name AS service_name, svv.vendor_name AS vendor_name, NULL AS is_b2b
          FROM EXPENSES e
          JOIN INTERNATIONAL_SHIPMENTS s ON e.expense_order = s.iid
          JOIN SERVICES sv ON s.service = sv.service_id
          JOIN SERVICE_VENDORS svv ON s.vendor = svv.id
          WHERE e.uid = ?

          ORDER BY date DESC
        `, [id, id]);


        return res.status(200).json({
            status: 200, success: true, data: rows
        });

    } catch (error) {
        return res.status(500).json({
            status: 500, message: 'Unexpected Error while fetching transactions', error: error.message
        });
    }
}

const getAllManualRechargeTransactions = async (req, res) => {
    const token = req.headers.authorization;

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const admin = verified.admin;
        if (admin) {
            const [rows] = await db.query('SELECT * FROM MANUAL_RECHARGE r JOIN USERS u ON r.beneficiary_id = u.uid');

            return res.status(200).json({
                status: 200, success: true, data: rows
            });
        }
        const [rows] = await db.query('SELECT * FROM MANUAL_RECHARGE where beneficiary_id = ?', [id]);


        return res.status(200).json({
            status: 200, success: true, data: rows
        });

    } catch (error) {
        return res.status(500).json({
            status: 500, message: 'Unexpected Error while fetching transactions', error: error.message
        });
    }
}

const getAllRefundTransactions = async (req, res) => {
    const token = req.headers.authorization;

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        const admin = verified.admin;
        if (admin) {
            const [rows] = await db.query('SELECT r.*, sv.service_name AS service_name, u.fullName FROM REFUND r JOIN USERS u ON r.uid = u.uid JOIN SHIPMENTS s ON r.refund_order = s.ord_id JOIN SERVICES sv ON s.serviceId = sv.service_id');
            return res.status(200).json({
                status: 200, success: true, data: rows
            });
        }

        const [rows] = await db.query(`
          SELECT r.*, sv.service_name AS service_name, NULL AS vendor_name, s.is_b2b AS is_b2b
          FROM REFUND r
          JOIN SHIPMENTS s ON r.refund_order = s.ord_id
          JOIN SERVICES sv ON s.serviceId = sv.service_id
          WHERE r.uid = ?

          UNION ALL

          SELECT r.*, sv.service_name AS service_name, svv.vendor_name AS vendor_name, NULL AS is_b2b
          FROM REFUND r
          JOIN INTERNATIONAL_SHIPMENTS s ON r.refund_order = s.iid
          JOIN SERVICES sv ON s.service = sv.service_id
          JOIN SERVICE_VENDORS svv ON s.vendor = svv.id
          WHERE r.uid = ?

          ORDER BY date DESC
        `, [id, id]);

        return res.status(200).json({
            status: 200, success: true, data: rows
        });

    } catch (error) {
        return res.status(500).json({
            status: 500, message: 'Unexpected Error while fetching transactions', error: error.message
        });
    }
}

// ADMIN aggregated wallet transactions with filtering & pagination
const getAllWalletTransactionsAdmin = async (req, res) => {
  const {admin} = req.user;
  if (!admin) return res.status(401).json({ success: false, message: 'Access Denied' });

  const {
    page = 1,
    startDate,
    endDate,
    order_id,
    merchant_email,
    merchant_name,
    merchant_business_name,
    type = 'all'
  } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
  }

  try {
    const PAGE_SIZE = 50;
    const currentPage = parseInt(page) || 1;
    const offset = (currentPage - 1) * PAGE_SIZE;

    // Build dynamic WHERE fragments for each table alias appropriately
    const filters = [];
    const params = [];
    const dateParams = [startDate, endDate];

    // Merchant filters (apply to USERS table alias u)
    if (merchant_email) {
      filters.push('u.email = ?');
      params.push(merchant_email);
    }
    if (merchant_name) {
      filters.push('u.fullName LIKE ?');
      params.push(`%${merchant_name}%`);
    }
    if (merchant_business_name) {
      filters.push('u.businessName LIKE ?');
      params.push(`%${merchant_business_name}%`);
    }

    // Type filter helper
    const includeType = (t) => type === 'all' || type === t;

    // Build unified selects (each must project identical column list)
    // Column order: id, order_id, payment_id, type, amount, remaining_balance, date, uid, fullName, email, businessName, service_name, reason
    const selects = [];

    if (includeType('dispute_charge')) {
      selects.push(`SELECT CONCAT('DIS', dc.id) AS id, dc.dispute_order AS order_id, NULL AS payment_id, 'dispute_charge' AS type,
        dc.dispute_charge AS amount, dc.remaining_balance, dc.date, u.uid, u.fullName, u.email, u.businessName, sv.service_name, NULL AS reason
        FROM DISPUTE_CHARGES dc
        JOIN USERS u ON dc.uid = u.uid
        JOIN SHIPMENTS sh ON dc.dispute_order = sh.ord_id
        JOIN SERVICES sv ON sh.serviceId = sv.service_id
        WHERE dc.date BETWEEN ? AND ? ${filters.length ? 'AND ' + filters.join(' AND ') : ''}`);
    }
    if (includeType('expense')) {
      // Domestic expenses
      selects.push(`SELECT CONCAT('EXP', e.xid) AS id, e.expense_order AS order_id, NULL AS payment_id, 'expense' AS type,
        e.expense_cost AS amount, e.remaining_balance, e.date, u.uid, u.fullName, u.email, u.businessName, sv.service_name, NULL AS reason
        FROM EXPENSES e
        JOIN USERS u ON e.uid = u.uid
        JOIN SHIPMENTS sh ON e.expense_order = sh.ord_id
        JOIN SERVICES sv ON sh.serviceId = sv.service_id
        WHERE e.date BETWEEN ? AND ? ${filters.length ? 'AND ' + filters.join(' AND ') : ''}`);
      // International expenses
      selects.push(`SELECT CONCAT('EXP', e.xid) AS id, e.expense_order AS order_id, NULL AS payment_id, 'expense' AS type,
        e.expense_cost AS amount, e.remaining_balance, e.date, u.uid, u.fullName, u.email, u.businessName, sv2.service_name, NULL AS reason
        FROM EXPENSES e
        JOIN USERS u ON e.uid = u.uid
        JOIN INTERNATIONAL_SHIPMENTS ish ON e.expense_order = ish.iid
        JOIN SERVICES sv2 ON ish.service = sv2.service_id
        WHERE e.date BETWEEN ? AND ? ${filters.length ? 'AND ' + filters.join(' AND ') : ''}`);
    }
    if (includeType('refund')) {
      // Domestic refunds
      selects.push(`SELECT CONCAT('REF', r.rid) AS id, r.refund_order AS order_id, NULL AS payment_id, 'refund' AS type,
        r.refund_amount AS amount, r.remaining_balance, r.date, u.uid, u.fullName, u.email, u.businessName, sv.service_name, NULL AS reason
        FROM REFUND r
        JOIN USERS u ON r.uid = u.uid
        JOIN SHIPMENTS sh ON r.refund_order = sh.ord_id
        JOIN SERVICES sv ON sh.serviceId = sv.service_id
        WHERE r.date BETWEEN ? AND ? ${filters.length ? 'AND ' + filters.join(' AND ') : ''}`);
      // International refunds
      selects.push(`SELECT CONCAT('REF', r.rid) AS id, r.refund_order AS order_id, NULL AS payment_id, 'refund' AS type,
        r.refund_amount AS amount, r.remaining_balance, r.date, u.uid, u.fullName, u.email, u.businessName, sv2.service_name, NULL AS reason
        FROM REFUND r
        JOIN USERS u ON r.uid = u.uid
        JOIN INTERNATIONAL_SHIPMENTS ish ON r.refund_order = ish.iid
        JOIN SERVICES sv2 ON ish.service = sv2.service_id
        WHERE r.date BETWEEN ? AND ? ${filters.length ? 'AND ' + filters.join(' AND ') : ''}`);
    }
    if (includeType('recharge')) {
      selects.push(`SELECT CONCAT('REC', rc.payment_id) AS id, rc.order_id AS order_id, rc.payment_id AS payment_id, 'recharge' AS type,
        rc.amount AS amount, rc.remaining_balance, rc.date, u.uid, u.fullName, u.email, u.businessName, NULL AS service_name, NULL AS reason
        FROM RECHARGE rc
        JOIN USERS u ON rc.uid = u.uid
        WHERE rc.date BETWEEN ? AND ? ${filters.length ? 'AND ' + filters.join(' AND ') : ''}`);
    }
    if (includeType('manual')) {
      selects.push(`SELECT CONCAT('MAN', mr.recharge_id) AS id, mr.recharge_id AS order_id, NULL AS payment_id, 'manual' AS type,
        mr.amount AS amount, mr.remaining_balance, mr.date, u.uid, u.fullName, u.email, u.businessName, NULL AS service_name, mr.reason AS reason
        FROM MANUAL_RECHARGE mr
        JOIN USERS u ON mr.beneficiary_id = u.uid
        WHERE mr.date BETWEEN ? AND ? ${filters.length ? 'AND ' + filters.join(' AND ') : ''}`);
    }

    if (!selects.length) {
      return res.status(200).json({ success: true, data: { rows: [], totalPages: 0, currentPage: 1, totalRecords: 0, hasPrevious: false, hasNext: false, count: 0 } });
    }

  const unionQuery = selects.join(' UNION ALL ');
  const finalQueryBase = `SELECT * FROM ( ${unionQuery} ) AS all_tx ${order_id ? 'WHERE order_id = ?' : ''} ORDER BY date DESC`;

    // Build parameters: for each SELECT we have date range + filters params (duplicated per SELECT)
    const perSelectParams = [];
  const baseParamSet = [...dateParams, ...params]; // date range + merchant filters per SELECT
    for (let i = 0; i < selects.length; i++) {
      perSelectParams.push(...baseParamSet);
    }
    if (order_id) perSelectParams.push(order_id);

    // Count total
  const countQuery = `SELECT COUNT(*) AS total FROM ( ${unionQuery} ) AS c ${order_id ? 'WHERE order_id = ?' : ''}`;
  const [countRows] = await db.query(countQuery, perSelectParams.slice(0, perSelectParams.length));
    const totalRecords = countRows[0]?.total || 0;
    const totalPages = Math.ceil(totalRecords / PAGE_SIZE) || 1;
  const paginatedQuery = `${finalQueryBase} LIMIT ? OFFSET ?`;
  const paginatedParams = [...perSelectParams, PAGE_SIZE, offset];
    const [rows] = await db.query(paginatedQuery, paginatedParams);

    return res.status(200).json({
      success: true,
      data: {
        rows,
        totalPages,
        currentPage,
        totalRecords,
        hasPrevious: currentPage > 1,
        hasNext: currentPage < totalPages,
        count: rows.length
      }
    });
  } catch (err) {
    console.error('Admin wallet tx error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// MERCHANT aggregated wallet transactions with filtering & pagination (scoped to their uid)
const getAllWalletTransactionsUser = async (req, res) => {
  const { admin, id: uid } = req.user;
  if (admin) return res.status(401).json({ success: false, message: 'Access Denied' });
  const {
    page = 1,
    startDate,
    endDate,
    order_id,
    type = 'all'
  } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
  }

  try {
  const PAGE_SIZE = 50000;
  const currentPage = parseInt(page) || 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

    const includeType = (t) => type === 'all' || type === t;
    const selects = [];
    const dateParams = [startDate, endDate];

    // We'll add uid as param for each select
    if (includeType('dispute_charge')) {
      selects.push(`SELECT CONCAT('DIS', dc.id) AS id, dc.dispute_order AS order_id, NULL AS payment_id, 'dispute_charge' AS type,
        dc.dispute_charge AS amount, dc.remaining_balance, dc.date, dc.uid AS uid, sv.service_name, NULL AS reason
        FROM DISPUTE_CHARGES dc
        JOIN SHIPMENTS sh ON dc.dispute_order = sh.ord_id
        JOIN SERVICES sv ON sh.serviceId = sv.service_id
        WHERE dc.date BETWEEN ? AND ? AND dc.uid = ?`);
    }
    if (includeType('expense')) {
      selects.push(`SELECT CONCAT('EXP', e.xid) AS id, e.expense_order AS order_id, NULL AS payment_id, 'expense' AS type,
          e.expense_cost AS amount, e.remaining_balance, e.date, e.uid AS uid, sv.service_name, NULL AS reason
        FROM EXPENSES e
        JOIN SHIPMENTS sh ON e.expense_order = sh.ord_id
        JOIN SERVICES sv ON sh.serviceId = sv.service_id
        WHERE e.date BETWEEN ? AND ? AND e.uid = ?`);
      
      selects.push(`SELECT CONCAT('EXP', e.xid) AS id, e.expense_order AS order_id, NULL AS payment_id, 'expense' AS type,
          e.expense_cost AS amount, e.remaining_balance, e.date, e.uid AS uid, sv.service_name, NULL AS reason
        FROM EXPENSES e
        JOIN INTERNATIONAL_SHIPMENTS ish ON e.expense_order = ish.iid
        JOIN SERVICES sv ON ish.service = sv.service_id
        WHERE e.date BETWEEN ? AND ? AND e.uid = ?`);
    }
    if (includeType('refund')) {
      selects.push(`SELECT CONCAT('REF', r.rid) AS id, r.refund_order AS order_id, NULL AS payment_id, 'refund' AS type,
        r.refund_amount AS amount, r.remaining_balance, r.date, r.uid AS uid, sv.service_name, NULL AS reason
        FROM REFUND r
        JOIN SHIPMENTS sh ON r.refund_order = sh.ord_id
        JOIN SERVICES sv ON sh.serviceId = sv.service_id
        WHERE r.date BETWEEN ? AND ? AND r.uid = ?`);

      selects.push(`SELECT CONCAT('REF', r.rid) AS id, r.refund_order AS order_id, NULL AS payment_id, 'refund' AS type,
        r.refund_amount AS amount, r.remaining_balance, r.date, r.uid AS uid, sv.service_name, NULL AS reason
        FROM REFUND r
        JOIN INTERNATIONAL_SHIPMENTS ish ON r.refund_order = ish.iid
        JOIN SERVICES sv ON ish.service = sv.service_id
        WHERE r.date BETWEEN ? AND ? AND r.uid = ?`);
    }
    if (includeType('recharge')) {
      selects.push(`SELECT CONCAT('REC', rc.id) AS id, rc.order_id AS order_id, rc.payment_id AS payment_id, 'recharge' AS type,
        rc.amount AS amount, rc.remaining_balance, rc.date, rc.uid AS uid, NULL AS service_name, NULL AS reason
        FROM RECHARGE rc
        WHERE rc.date BETWEEN ? AND ? AND rc.uid = ?`);
    }
    if (includeType('manual')) {
      selects.push(`SELECT CONCAT('MAN', mr.recharge_id) AS id, mr.recharge_id AS order_id, NULL AS payment_id, 'manual' AS type,
        mr.amount AS amount, mr.remaining_balance, mr.date, mr.beneficiary_id AS uid, NULL AS service_name, mr.reason AS reason
        FROM MANUAL_RECHARGE mr
        WHERE mr.date BETWEEN ? AND ? AND mr.beneficiary_id = ?`);
    }

    if (!selects.length) {
      return res.status(200).json({ success: true, data: { rows: [], totalPages: 0, currentPage: 1, totalRecords: 0, hasPrevious: false, hasNext: false, count: 0 } });
    }

  const unionQuery = selects.join(' UNION ALL ');
  const finalQueryBase = `SELECT * FROM ( ${unionQuery} ) AS all_tx ${order_id ? 'WHERE order_id = ?' : ''} ORDER BY date DESC`;

    // parameters duplication
    const perSelectParams = [];
    const baseParams = [...dateParams, uid];
    for (let i = 0; i < selects.length; i++) perSelectParams.push(...baseParams);
    if (order_id) perSelectParams.push(order_id);

  const countQuery = `SELECT COUNT(*) AS total FROM ( ${unionQuery} ) AS c ${order_id ? 'WHERE order_id = ?' : ''}`;
  const [countRows] = await db.query(countQuery, perSelectParams);
  const totalRecords = countRows[0]?.total || 0;
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE) || 1;

  const paginatedQuery = `${finalQueryBase} LIMIT ? OFFSET ?`;
    const paginatedParams = [...perSelectParams, PAGE_SIZE, offset];
    const [rows] = await db.query(paginatedQuery, paginatedParams);

    return res.status(200).json({
      success: true,
      data: {
        rows,
        totalPages,
        currentPage,
        totalRecords,
        hasPrevious: currentPage > 1,
        hasNext: currentPage < totalPages,
        count: rows.length
      }
    });
  } catch (err) {
    console.error('User wallet tx error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

const manualRecharge = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401, message: 'Access Denied'
        });
    }
    const { email, amount, reason } = req.body;
    if (!email || !amount || !reason) {
        return res.status(400).json({
            status: 400, message: 'All fields are required'
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const admin = verified.admin;
        if (!admin) {
            return res.status(400).json({
                status: 400, message: 'Not an admin'
            });
        }
        try {
            const transaction = await db.beginTransaction();
            const [users] = await transaction.query('SELECT * FROM USERS WHERE email = ?', [email]);
            if (users.length) {
                const uid = users[0].uid;
                await transaction.query('INSERT INTO MANUAL_RECHARGE (beneficiary_id, amount, reason) VALUES (?,?,?)', [uid, amount, reason]);
            }
            else {
                await db.rollback(transaction)
                return {
                    status: 400, message: 'User not found'
                };
            }
            await db.commit(transaction);
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Manual Recharge Received',
                text: `Dear Merchant, \nYour wallet got manually ${amount >= 0 ? "credited" : "debited"} by ₹${amount}.\nRegards,\nJupiter Xpress`
            };
            await transporter.sendMail(mailOptions);
            return res.status(200).json({
                status: 200, success: true, message: "Recharge successfull"
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, message: error.message, error: error.message
            });
        }
    } catch (err) {
        return res.status(400).json({
            status: 400, message: 'Invalid Token'
        });
    }
}

const verifyRazorpayRecharge = async (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, uid, amount } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !uid || !amount) {
        return res.status(400).json({
            status: 400, error: 'Missing required parameters'
        });
    }
    try {
        // Verify the payment signature
        const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({
                status: 400, error: 'Invalid payment signature'
            });
        }

        try {
            // Update user's wallet balance in database
            const transaction = await db.beginTransaction();
            // Insert transaction record
            const transactionDetails = {
                uid,
                razorpay_payment_id,
                razorpay_order_id,
                amount,
                date: new Date(),
            };

            await transaction.query(
                'INSERT INTO RECHARGE (uid, payment_id, order_id, amount, date) VALUES (?, ?, ?, ?, ?)',
                [transactionDetails.uid, transactionDetails.razorpay_payment_id, transactionDetails.razorpay_order_id, transactionDetails.amount, transactionDetails.date]
            );
            await db.commit(transaction);
            const [users] = await db.query("SELECT * FROM USERS WHERE uid = ?", [uid]);
            const { email, fullName } = users[0];
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Wallet Recharge Successfull',
                text: `Dear ${fullName}, \nYour wallet recharge for amount ₹${amount} and order Id : ${transactionDetails.razorpay_order_id} has been verified and credited to your wallet.\nRegards,\nJupiter Xpress`
            };
            await transporter.sendMail(mailOptions);
            return res.status(200).json({
                status: 200, success: true, message: "Recharge Successfull"
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, error: error.message
            });
        }
    } catch (error) {
        return res.status(500).json({
            status: 500, error: 'Something went wrong'
        });
    }
}

// const exportTransactionsJSON = async (req, res) => {
//   const { startDate, endDate, merchant_email } = req.body;

//   if (!startDate || !endDate) {
//     return res.status(400).json({
//       status: 400,
//       message: 'Start date and end date are required',
//     });
//   }

//   if (merchant_email && typeof merchant_email !== 'string') {
//     return res.status(400).json({
//       status: 400,
//       message: 'Invalid merchant email',
//     });
//   }

//   try {
//     let uidFilter = '';
//     let values = [];

//     if (merchant_email) {
//       const [merchantRow] = await db.query('SELECT uid FROM USERS WHERE email = ?', [merchant_email]);
//       if (!merchantRow.length) {
//         return res.status(404).json({ success: false, message: 'Merchant not found' });
//       }
//       uidFilter = ' AND s.uid = ?';
//       values.push(merchantRow[0].uid);
//     }

//     if (startDate) {
//       uidFilter += ' AND s.date >= ?';
//       values.push(`${startDate}`);
//     }

//     if (endDate) {
//       uidFilter += ' AND s.date <= ?';
//       values.push(`${endDate}`);
//     }

//     const queries = {
//       'Dispute Charges': `
//         SELECT 
//           u.fullName AS MERCHANT_NAME, 
//           u.email AS MERCHANT_EMAIL, 
//           u.phone AS MERCHANT_PHONE,
//           s.dispute_order AS ORDER_ID, 
//           s.dispute_charge AS DISPUTE_CHARGE, 
//           s.date AS DATE,
//           s.remaining_balance AS REMAINING_BALANCE,
//           'Dispute Charge' AS TYPE
//         FROM DISPUTE_CHARGES s
//         JOIN USERS u ON s.uid = u.uid
//         WHERE 1=1 ${uidFilter}
//       `,
//       'Expenses': `
//         SELECT 
//           u.fullName AS MERCHANT_NAME, 
//           u.email AS MERCHANT_EMAIL, 
//           u.phone AS MERCHANT_PHONE,
//           s.expense_order AS ORDER_ID, 
//           s.expense_cost AS ORDER_AMOUNT, 
//           s.date AS DATE,
//           s.remaining_balance AS REMAINING_BALANCE,
//           'Expense' AS TYPE
//         FROM EXPENSES s
//         JOIN USERS u ON s.uid = u.uid
//         WHERE 1=1 ${uidFilter}
//       `,
//       'Manual Recharges': `
//         SELECT 
//           u.fullName AS MERCHANT_NAME, 
//           u.email AS MERCHANT_EMAIL, 
//           u.phone AS MERCHANT_PHONE,
//           s.amount AS RECHARGE_AMOUNT, 
//           s.date AS DATE,
//           s.reason AS REASON,
//           s.remaining_balance AS REMAINING_BALANCE,
//           'Manual Recharge' AS TYPE
//         FROM MANUAL_RECHARGE s
//         JOIN USERS u ON s.beneficiary_id = u.uid
//         WHERE 1=1 ${uidFilter.replace(/s\.uid/g, 's.beneficiary_id')}
//       `,
//       'Recharges': `
//         SELECT 
//           u.fullName AS MERCHANT_NAME, 
//           u.email AS MERCHANT_EMAIL, 
//           u.phone AS MERCHANT_PHONE,
//           s.order_id AS RECHARGE_ORDER_ID,
//           s.payment_id AS RECHARGE_PAYMENT_ID, 
//           s.amount AS RECHARGE_AMOUNT, 
//           s.date AS DATE,
//           s.remaining_balance AS REMAINING_BALANCE,
//           'Recharge' AS TYPE
//         FROM RECHARGE s
//         JOIN USERS u ON s.uid = u.uid
//         WHERE 1=1 ${uidFilter}
//       `,
//       'Refunds': `
//         SELECT 
//           u.fullName AS MERCHANT_NAME, 
//           u.email AS MERCHANT_EMAIL, 
//           u.phone AS MERCHANT_PHONE,
//           s.refund_order AS REFUND_ORDER, 
//           s.refund_amount AS REFUND_AMOUNT, 
//           s.date AS DATE,
//           s.remaining_balance AS REMAINING_BALANCE,
//           'Refund' AS TYPE
//         FROM REFUND s
//         JOIN USERS u ON s.uid = u.uid
//         WHERE 1=1 ${uidFilter}
//       `,
//     };

//     const result = {};

//     for (const [type, query] of Object.entries(queries)) {
//       const [rows] = await db.query(query, values);
//       result[type] = rows.map((r) => ({...r}));
//     }

//     res.status(200).json({
//       success: true,
//       data: result,
//     });

//   } catch (err) {
//     console.error('Export error:', err);
//     res.status(500).json({ success: false, message: 'Server error during export' });
//   }
// };


const exportAllTransactionsJSON = async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({
      status: 401,
      message: 'Access Denied',
    });
  }
  const { startDate, endDate, merchant_email } = req.body;
  if (!startDate || !endDate) {
    return res.status(400).json({
      status: 400,
      message: 'Start date and end date are required',
    });
  }

  if (merchant_email && typeof merchant_email !== 'string') {
    return res.status(400).json({
      status: 400,
      message: 'Invalid merchant email',
    });
  }

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    const admin = verified.admin;
    if (!admin) {
      return res.status(401).json({
        status: 401,
        message: 'Access Denied: Admin privileges required'
      })
    }
    const emailFilter = merchant_email ? ` AND u.email = ?` : '';
    const values = [
      `${startDate}`, `${endDate}}`,
      ...(merchant_email ? [merchant_email] : []),

      `${startDate}`, `${endDate}}`,
      ...(merchant_email ? [merchant_email] : []),

      `${startDate}`, `${endDate}}`,
      ...(merchant_email ? [merchant_email] : []),

      `${startDate}`, `${endDate}}`,
      ...(merchant_email ? [merchant_email] : []),

      `${startDate}`, `${endDate}}`,
      ...(merchant_email ? [merchant_email] : []),
    ];

    const unifiedQuery = `
      SELECT 
        u.fullName AS MERCHANT_NAME, 
        u.email AS MERCHANT_EMAIL, 
        u.phone AS MERCHANT_PHONE,
        s.dispute_order AS ORDER_ID,
        NULL AS PAYMENT_ID,
        sv.service_name AS SERVICE_NAME,
        s.dispute_charge AS AMOUNT,
        s.date AS DATE,
        NULL AS REASON,
        s.remaining_balance AS REMAINING_BALANCE,
        'Dispute Charge' AS TRANSACTION_TYPE,
        'DEBIT' AS CREDIT_OR_DEBIT
      FROM DISPUTE_CHARGES s
      JOIN USERS u ON s.uid = u.uid
      JOIN SHIPMENTS sh ON s.dispute_order = sh.ord_id
      JOIN SERVICES sv ON sh.serviceId = sv.service_id
      WHERE s.date >= ? AND s.date <= ?${emailFilter}

      UNION ALL

      SELECT 
        u.fullName, u.email, u.phone,
        s.expense_order, 
        NULL,
        sv.service_name,
        s.expense_cost,
        s.date,
        NULL,
        s.remaining_balance,
        'Expense',
        'DEBIT'
      FROM EXPENSES s
      JOIN USERS u ON s.uid = u.uid
      JOIN SHIPMENTS sh ON s.expense_order = sh.ord_id
      JOIN SERVICES sv ON sh.serviceId = sv.service_id
      WHERE s.date >= ? AND s.date <= ?${emailFilter}

      UNION ALL

      SELECT 
        u.fullName, u.email, u.phone,
        NULL,
        NULL,
        NULL,
        s.amount,
        s.date,
        s.reason,
        s.remaining_balance,
        'Manual Recharge',
        'CREDIT'
      FROM MANUAL_RECHARGE s
      JOIN USERS u ON s.beneficiary_id = u.uid
      WHERE s.date >= ? AND s.date <= ?${emailFilter}

      UNION ALL

      SELECT 
        u.fullName, u.email, u.phone,
        s.order_id,
        s.payment_id,
        NULL,
        s.amount,
        s.date,
        NULL,
        s.remaining_balance,
        'Recharge',
        'CREDIT'
      FROM RECHARGE s
      JOIN USERS u ON s.uid = u.uid
      WHERE s.date >= ? AND s.date <= ?${emailFilter}

      UNION ALL

      SELECT 
        u.fullName, u.email, u.phone,
        s.refund_order,
        NULL,
        sv.service_name,
        s.refund_amount,
        s.date,
        NULL,
        s.remaining_balance,
        'Refund',
        'CREDIT'
      FROM REFUND s
      JOIN USERS u ON s.uid = u.uid
      JOIN SHIPMENTS sh ON s.refund_order = sh.ord_id
      JOIN SERVICES sv ON sh.serviceId = sv.service_id
      WHERE s.date >= ? AND s.date <= ?${emailFilter}

      ORDER BY DATE DESC
    `;

    const [rows] = await db.query(unifiedQuery, values);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ success: false, message: 'Server error during export' });
  }
};

const exportTransactionsJSON = async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({
      status: 401,
      message: 'Access Denied',
    });
  }

  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({
      status: 400,
      message: 'Start date and end date are required',
    });
  }

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    const uid = verified.id;

    const values = [
      `${startDate}`, `${endDate}}`, uid,
      `${startDate}`, `${endDate}}`, uid,
      `${startDate}`, `${endDate}}`, uid,
      `${startDate}`, `${endDate}}`, uid,
      `${startDate}`, `${endDate}}`, uid
    ];

    const query = `
      SELECT 
        s.dispute_order AS ORDER_ID,
        NULL AS PAYMENT_ID,
        sv.service_name AS SERVICE_NAME,
        s.dispute_charge AS AMOUNT,
        s.date AS DATE,
        NULL AS REASON,
        s.remaining_balance AS REMAINING_BALANCE,
        'Dispute Charge' AS TRANSACTION_TYPE,
        'DEBIT' AS CREDIT_OR_DEBIT
      FROM DISPUTE_CHARGES s
      JOIN SHIPMENTS sh ON s.dispute_order = sh.ord_id
      JOIN SERVICES sv ON sh.serviceId = sv.service_id
      WHERE s.date >= ? AND s.date <= ? AND s.uid = ?

      UNION ALL

      SELECT 
        s.expense_order, 
        NULL,
        sv.service_name,
        s.expense_cost,
        s.date,
        NULL,
        s.remaining_balance,
        'Expense',
        'DEBIT'
      FROM EXPENSES s
      JOIN SHIPMENTS sh ON s.expense_order = sh.ord_id
      JOIN SERVICES sv ON sh.serviceId = sv.service_id
      WHERE s.date >= ? AND s.date <= ? AND s.uid = ?

      UNION ALL

      SELECT 
        NULL,
        NULL,
        NULL,
        s.amount,
        s.date,
        s.reason,
        s.remaining_balance,
        'Manual Recharge',
        'CREDIT'
      FROM MANUAL_RECHARGE s
      WHERE s.date >= ? AND s.date <= ? AND s.beneficiary_id = ?

      UNION ALL

      SELECT 
        s.order_id,
        s.payment_id,
        NULL,
        s.amount,
        s.date,
        NULL,
        s.remaining_balance,
        'Recharge',
        'CREDIT'
      FROM RECHARGE s
      JOIN SHIPMENTS sh ON s.order_id = sh.ord_id
      JOIN SERVICES sv ON sh.serviceId = sv.service_id
      WHERE s.date >= ? AND s.date <= ? AND s.uid = ?

      UNION ALL

      SELECT 
        s.refund_order,
        NULL,
        sv.service_name,
        s.refund_amount,
        s.date,
        NULL,
        s.remaining_balance,
        'Refund',
        'CREDIT'
      FROM REFUND s
      JOIN SHIPMENTS sh ON s.refund_order = sh.ord_id
      JOIN SERVICES sv ON sh.serviceId = sv.service_id
      WHERE s.date >= ? AND s.date <= ? AND s.uid = ?

      ORDER BY DATE DESC
    `;

    const [rows] = await db.query(query, values);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ success: false, message: 'Server error during export' });
  }
};

const getTransactions = async (req, res) => {
  const token = req.headers.authorization;
  const { type, startDate, endDate, page = 1, id: queryId, merchant_email } = req.query;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied' });
  }

  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Start and end dates are required' });
  }

  const limit = 50;
  const offset = (parseInt(page) - 1) * limit;

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    const isAdmin = verified.admin || false;
    let uid = verified.id; // fallback uid

    // Override with merchant_email if present
    if (isAdmin && merchant_email) {
      const [merchantRows] = await db.query(`SELECT uid FROM USERS WHERE email = ? LIMIT 1`, [merchant_email]);
      if (!merchantRows.length) {
        return res.status(404).json({ status: 404, message: 'Merchant email not found' });
      }
      uid = merchantRows[0].uid;
    } else if (isAdmin && queryId) {
      uid = queryId;
    }

    const queries = [];
    const dateFilter = `AND t.date BETWEEN ? AND ?`;
    const dateParams = [startDate, endDate];

    const queryMap = {
      recharge: {
        sql: `SELECT t.*, u.fullName, u.email FROM RECHARGE t 
              JOIN USERS u ON t.uid = u.uid 
              WHERE t.uid = ? ${dateFilter}`,
        params: [uid],
      },
      dispute: {
        sql: isAdmin
          ? `SELECT t.*, sv.service_name, u.fullName, u.email FROM DISPUTE_CHARGES t 
              JOIN USERS u ON t.uid = u.uid 
              JOIN SHIPMENTS s ON t.dispute_order = s.ord_id 
              JOIN SERVICES sv ON s.serviceId = sv.service_id 
              WHERE t.uid = ? ${dateFilter}`
          : `SELECT t.*, sv.service_name FROM DISPUTE_CHARGES t 
              JOIN SHIPMENTS s ON t.dispute_order = s.ord_id 
              JOIN SERVICES sv ON s.serviceId = sv.service_id 
              WHERE t.uid = ? ${dateFilter}`,
        params: [uid],
      },
      expense: {
        sql: isAdmin
          ? `SELECT t.*, sv.service_name, u.fullName, u.email FROM EXPENSES t 
              JOIN USERS u ON t.uid = u.uid 
              JOIN SHIPMENTS s ON t.expense_order = s.ord_id 
              JOIN SERVICES sv ON s.serviceId = sv.service_id 
              WHERE t.uid = ? ${dateFilter}`
          : `SELECT t.*, sv.service_name FROM EXPENSES t 
              JOIN SHIPMENTS s ON t.expense_order = s.ord_id 
              JOIN SERVICES sv ON s.serviceId = sv.service_id 
              WHERE t.uid = ? ${dateFilter}`,
        params: [uid],
      },
      manual: {
        sql: isAdmin
          ? `SELECT t.*, u.fullName, u.email FROM MANUAL_RECHARGE t 
              JOIN USERS u ON t.beneficiary_id = u.uid 
              WHERE t.beneficiary_id = ? ${dateFilter}`
          : `SELECT t.* FROM MANUAL_RECHARGE t 
              WHERE t.beneficiary_id = ? ${dateFilter}`,
        params: [uid],
      },
      refund: {
        sql: isAdmin
          ? `SELECT t.*, sv.service_name, u.fullName, u.email FROM REFUND t 
              JOIN USERS u ON t.uid = u.uid 
              JOIN SHIPMENTS s ON t.refund_order = s.ord_id 
              JOIN SERVICES sv ON s.serviceId = sv.service_id 
              WHERE t.uid = ? ${dateFilter}`
          : `SELECT t.*, sv.service_name FROM REFUND t 
              JOIN SHIPMENTS s ON t.refund_order = s.ord_id 
              JOIN SERVICES sv ON s.serviceId = sv.service_id 
              WHERE t.uid = ? ${dateFilter}`,
        params: [uid],
      },
    };

    const typesToFetch = type ? [type] : Object.keys(queryMap);

    for (const t of typesToFetch) {
      if (queryMap[t]) {
        const [rows] = await db.query(queryMap[t].sql, [...queryMap[t].params, ...dateParams]);
        queries.push(...rows);
      }
    }

    // Sort and paginate
    queries.sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalEntries = queries.length;
    const totalPages = Math.ceil(totalEntries / limit);
    const paginated = queries.slice(offset, offset + limit);

    return res.status(200).json({
      status: 200,
      success: true,
      currentPage: parseInt(page),
      totalPages,
      totalEntries,
      data: paginated,
    });
  } catch (err) {
    console.error('Transaction fetch error:', err);
    return res.status(500).json({ status: 500, message: 'Server error', error: err.message });
  }
};


module.exports = {
    createRazorpayOrderId,
    getAllRechargeTransactions,
    getBalance,
    getAllExpenseTransactions,
    getAllManualRechargeTransactions,
    getAllRefundTransactions,
    manualRecharge,
    verifyRazorpayRecharge,
    getAllDisputeChargesTransactions,
    exportAllTransactionsJSON,
    exportTransactionsJSON,
    getTransactions,
    getAllWalletTransactionsAdmin,
    getAllWalletTransactionsUser
};