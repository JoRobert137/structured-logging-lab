const { Pool } = require('pg');
const { logger } = require('./logger');

const dbHost = process.env.DB_HOST || 'localhost';
const dbName = process.env.DB_NAME || 'ordersdb';

const pool = new Pool({
  host: dbHost,
  user: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASSWORD || 'mypassword',
  database: dbName,
  port: process.env.DB_PORT || 5432,
});

const connectDb = async () => {
  logger.info({ host: dbHost, database: dbName }, 'db.connecting');
  try {
    await pool.query('SELECT NOW()');
    logger.info({ host: dbHost, database: dbName }, 'db.connected');
  } catch (err) {
    logger.warn({ host: dbHost, database: dbName, error: err.message }, 'db.connection_failed_retrying');
  }
};

const queryDb = async (text, params, log = logger) => {
  log.debug({ query: text }, 'db.query_started');
  try {
    const res = await pool.query(text, params);
    log.debug({ rowCount: res.rowCount }, 'db.query_completed');
    return res;
  } catch (err) {
    log.error({ query: text, error: err.message }, 'db.query_failed');
    throw err;
  }
};

module.exports = { connectDb, queryDb, pool };

