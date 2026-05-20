const mysql = require('mysql2');
require('dotenv').config();

// Creates a MySQL connection pool using values from the .env file.
// If an environment value is missing, the default local value is used.
const db = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'librasys',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Tests the database connection when the server starts.
db.query('SELECT 1', (err) => {
  if (err) {
    console.warn('Warning: Database not available:', err.message);
    console.warn('Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME env vars to connect to MySQL.');
  } else {
    console.log('Connected to MySQL database');
  }
});

// Exports the shared database pool so controllers can use it.
module.exports = db;