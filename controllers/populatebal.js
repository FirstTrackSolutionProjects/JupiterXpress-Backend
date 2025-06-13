const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'ftst-sql.c1s88m8y0hjs.ap-south-1.rds.amazonaws.com',
  user: 'admin',
  password: '1e672741-8c79-43b3-9b1c-dafcdc5a184d',
  database: 'jupiterXpress'
});

(async () => {
  const [transactions] = await pool.query(`
    SELECT uid, date, signed_amount, source_table, txn_id FROM (
      SELECT uid, date, amount AS signed_amount, 'RECHARGE' AS source_table, payment_id AS txn_id FROM RECHARGE
      UNION ALL
      SELECT beneficiary_id AS uid, date, amount, 'MANUAL_RECHARGE', recharge_id FROM MANUAL_RECHARGE
      UNION ALL
      SELECT uid, date, -expense_cost, 'EXPENSES', xid FROM EXPENSES
      UNION ALL
      SELECT uid, date, CAST(refund_amount AS DECIMAL(10,2)), 'REFUND', rid FROM REFUND
      UNION ALL
      SELECT uid, date, -dispute_charge, 'DISPUTE_CHARGES', id FROM DISPUTE_CHARGES
    ) AS unified
    ORDER BY uid, date, txn_id
  `);

  const balances = {}; // { uid: currentBalance }
  const updates = {
    RECHARGE: [],
    MANUAL_RECHARGE: [],
    EXPENSES: [],
    REFUND: [],
    DISPUTE_CHARGES: []
  };

  for (const txn of transactions) {
    const { uid, signed_amount, source_table, txn_id } = txn;
    if (!(uid in balances)) {
      balances[uid] = 10.00; // STARTING BALANCE
    }

    balances[uid] += parseFloat(signed_amount);
    updates[source_table].push({ id: txn_id, balance: balances[uid] });
  }

  // Helper to get primary key column per table
  const getIdColumn = (table) => ({
    RECHARGE: 'payment_id',
    MANUAL_RECHARGE: 'recharge_id',
    EXPENSES: 'xid',
    REFUND: 'rid',
    DISPUTE_CHARGES: 'id'
  })[table];

  // Batch updates (optional: do it in transactions/batches for large data)
  for (const table in updates) {
    for (const { id, balance } of updates[table]) {
      const idCol = getIdColumn(table);
      await pool.query(`UPDATE ${table} SET remaining_balance = ? WHERE ${idCol} = ?`, [balance, id]);
    }
  }

  console.log('✅ remaining_balance populated.');
})();
