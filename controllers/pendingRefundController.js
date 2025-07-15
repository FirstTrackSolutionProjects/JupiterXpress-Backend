const db = require('../utils/db');

const getPendingRefunds = async (req, res) => {
    try {
        const { admin } = req.user;
        if (!admin) {
            return res.status(403).json({ message: 'Access Denied' });
        }
        const [refunds] = await db.query('SELECT s.*, e.expense_cost, u.fullName, sv.service_name FROM SHIPMENTS s JOIN USERS u ON s.uid = u.uid JOIN EXPENSES e ON s.ord_id = e.expense_order JOIN SERVICES sv ON s.serviceId = sv.service_id WHERE s.pending_refund = true');
        return res.status(200).json({
            success: true,
            data: refunds,
            message: 'Pending refunds retrieved successfully'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

const creditRefund = async (req, res) => {
    let transaction;
    try {
        const { admin } = req.user;
        if (!admin) {
            return res.status(403).json({ message: 'Access Denied' });
        }
        const ordId = req.params.ord_id;
        if (!ordId) {
            return res.status(400).json({ message: 'Order ID is required' });
        }
        transaction = await db.beginTransaction();
        const [shipment] = await transaction.query('SELECT * FROM SHIPMENTS WHERE ord_id = ?', [ordId]);
        if (shipment.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Shipment not found' });
        }
        if (!shipment[0].pending_refund) {
            await transaction.rollback();
            return res.status(400).json({ message: 'No pending refund for this shipment' });
        }
        await transaction.query('UPDATE SHIPMENTS SET pending_refund = false WHERE ord_id = ?', [ordId]);
        const [expenses] = await transaction.query('SELECT expense_cost FROM EXPENSES WHERE expense_order = ?', [ordId]);
        if (expenses.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Expense not found for this order' });
        }
        const expenseCost = expenses[0].expense_cost;
        await transaction.query('INSERT INTO REFUND (uid, refund_order, refund_amount) VALUES (?, ?)', [shipment[0].uid, ordId, expenseCost]);
        await transaction.commit();
        return res.status(200).json({
            success: true,
            message: 'Refund credited successfully'
        });
    } catch (error) {
        console.error(error);
        if (transaction) {
            await transaction.rollback();
        }
        return res.status(500).json({ message: 'Internal Server Error', error });
    }
}

module.exports = {
    getPendingRefunds,
    creditRefund
};