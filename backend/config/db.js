const mysql = require('mysql2');
require('dotenv').config();

/*
  XAMPP / phpMyAdmin DATABASE CONNECTION
  --------------------------------------
  This file is the single place where the Node backend connects to MySQL.
  In our local XAMPP setup, MySQL runs on localhost with the root user and
  no password, and the database name is librasys.

  If mam asks "where is the database connected?", show this file:
  backend/config/db.js

  The routes do not connect to phpMyAdmin directly. phpMyAdmin is only a UI
  for viewing MySQL. The backend connects to the actual MySQL database here.
*/
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'librasys',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
};

// Creates a MySQL connection pool using values from the .env file.
// If an environment value is missing, the default local value is used.
const db = mysql.createPool(dbConfig);
const originalQuery = db.query.bind(db);

db.configForLogs = {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  connectionLimit: dbConfig.connectionLimit,
};

db.query = function loggedQuery(sql, values, callback) {
  const start = Date.now();
  const cb = typeof values === 'function' ? values : callback;
  const queryValues = typeof values === 'function' ? undefined : values;
  const preview = typeof sql === 'string' ? sql.replace(/\s+/g, ' ').trim().slice(0, 220) : '[query object]';

  const wrapped = function wrappedCallback(err, results, fields) {
    const elapsed = Date.now() - start;
    if (err) {
      console.error('[db:error]', {
        elapsedMs: elapsed,
        code: err.code,
        message: err.message,
        sql: preview,
      });
    } else if (process.env.DB_LOG_QUERIES === 'true' || elapsed > 250) {
      const rowCount = Array.isArray(results) ? results.length : results?.affectedRows;
      console.log('[db:query]', { elapsedMs: elapsed, rowCount, sql: preview });
    }

    if (cb) cb(err, results, fields);
  };

  return queryValues === undefined
    ? originalQuery(sql, wrapped)
    : originalQuery(sql, queryValues, wrapped);
};

// Tests the database connection when the server starts.
db.query('SELECT 1', (err) => {
  if (err) {
    console.warn('Warning: Database not available:', err.message);
    console.warn('Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME env vars to connect to MySQL.');
  } else {
    console.log('Connected to MySQL database', db.configForLogs);
  }
});

// Exports the shared database pool so controllers can use it.
module.exports = db;
