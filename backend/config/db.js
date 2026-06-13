/**
 * SkillSwap - MySQL Database Configuration
 * Uses connection pooling for better performance
 */

const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'skillswap_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+00:00'
});

// Get promise-based pool
const promisePool = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('   → Make sure MySQL is running on', process.env.DB_HOST + ':' + process.env.DB_PORT);
    }
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   → Check your DB_USER and DB_PASSWORD in .env');
    }
    if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('   → Database "' + process.env.DB_NAME + '" does not exist. Please run database.sql first.');
    }
    return;
  }
  console.log('✅ MySQL database connected successfully');
  console.log('   → Host:', process.env.DB_HOST + ':' + process.env.DB_PORT);
  console.log('   → Database:', process.env.DB_NAME);
  connection.release();
});

module.exports = promisePool;
