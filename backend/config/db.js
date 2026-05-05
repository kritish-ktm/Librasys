const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'librasys',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.query('SELECT 1', (err) => {
  if (err) {
    console.warn('Warning: Database not available:', err.message);
    console.warn('Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME env vars to connect to MySQL.');
  } else {
    console.log('Connected to MySQL database');
  }
});

module.exports = db;
