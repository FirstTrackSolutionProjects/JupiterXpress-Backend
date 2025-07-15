const db = require('../utils/db');

const getPendingCancellations = async (req, res) => {
    try {
        const { admin } = req.user;
        if (!admin) {
            return res.status(403).json({ message: 'Access Denied' });
        }
        const [cancellations] = await db.query('SELECT s.*, u.fullName, sv.service_name FROM SHIPMENTS s JOIN USERS u ON s.uid = u.uid JOIN SERVICES sv ON s.serviceId = sv.service_id WHERE s.pending_cancellation = true');
        return res.status(200).json({
            success: true,
            data: cancellations,
            message: 'Pending cancellations retrieved successfully'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

const approveCancellation = async (req, res) => {
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
        await transaction.query('UPDATE SHIPMENTS SET cancelled = true, pending_cancellation = false, pending_refund = true WHERE ord_id = ?', [ordId]);
        await transaction.commit();
        return res.status(200).json({
            success: true,
            message: 'Cancellation approved successfully'
        });
    } catch (error) {
        console.error(error);
        if (transaction) {
            await transaction.rollback();
        }
    }
}

const rejectCancellation = async (req, res) => {
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
        await transaction.query('UPDATE SHIPMENTS SET cancelled = false, pending_cancellation = false, pending_refund = false WHERE ord_id = ?', [ordId]);
        await transaction.commit();
        return res.status(200).json({
            success: true,
            message: 'Cancellation rejected successfully'
        });
    } catch (error) {
        console.error(error);
        if (transaction) {
            await transaction.rollback();
        }
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

module.exports = {
    getPendingCancellations,
    approveCancellation,
    rejectCancellation
};