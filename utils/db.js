const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,        // e.g., '127.0.0.1' or your database IP
    user: process.env.DB_USER,        // e.g., 'root' or your MySQL username
    password: process.env.DB_PASSWORD,    // Your MySQL password
    database: process.env.DB_NAME,    // The database name you want to connect to
    port: process.env.DB_PORT || 3306, // Default MySQL port is 3306
    waitForConnections: true,         // Wait for a connection if pool is full
    connectionLimit: 200,              // Adjust the connection limit (discussed earlier)
    queueLimit: 0                     // No limit to the number of queued connection requests
});

const connectDB = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL connected');
        connection.release(); // Release the connection back to the pool
    } catch (error) {
        console.error('MySQL connection error:', error.message);
        process.exit(1);
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    connectDB,
};
