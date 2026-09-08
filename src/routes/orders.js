const express = require('express');
const router = express.Router();
const { queryDb } = require('../db');
const { logger } = require('../logger');

router.get('/', async (req, res) => {
  const log = req.log || logger;
  log.info('orders.list.started');
  try {
    const result = await queryDb('SELECT * FROM orders', [], log);
    log.info({ count: result.rows ? result.rows.length : 0 }, 'orders.list.success');
    res.json(result.rows);
  } catch (err) {
    log.error({ error: err.message }, 'orders.list.failed');
    res.status(500).send('Error fetching orders');
  }
});

router.post('/', async (req, res) => {
  const log = req.log || logger;
  const { product_id, quantity, customer_id } = req.body || {};
  log.info({ product_id, quantity, customer_id }, 'orders.create.started');
  
  if (!product_id || !quantity || !customer_id) {
    log.warn({ product_id, quantity, customer_id }, 'orders.create.validation_failed');
    return res.status(400).send('Missing fields');
  }

  try {
    const result = await queryDb(
      'INSERT INTO orders (product_id, quantity, customer_id) VALUES ($1, $2, $3) RETURNING *',
      [product_id, quantity, customer_id],
      log
    );
    const createdOrder = result.rows[0];
    log.info({ orderId: createdOrder ? createdOrder.id : null, product_id, customer_id }, 'orders.create.success');
    res.status(201).json(createdOrder);
  } catch (err) {
    log.error({ error: err.message, product_id, customer_id }, 'orders.create.failed');
    res.status(500).send('Error creating order');
  }
});

module.exports = router;

