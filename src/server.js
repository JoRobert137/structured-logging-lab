const crypto = require('crypto');
const express = require('express');
const { logger } = require('./logger');
const { connectDb } = require('./db');
const ordersRouter = require('./routes/orders');
const { processPayment } = require('./payment');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Attach request ID and scoped logger to every incoming request
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  req.log = logger.child({ reqId });

  const startTime = Date.now();
  req.log.info({ method: req.method, path: req.path }, 'request.received');

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    req.log[logLevel]({ method: req.method, path: req.path, statusCode: res.statusCode, durationMs }, 'request.completed');
  });

  next();
});

logger.info({ port }, 'server.starting');

connectDb();

app.get('/', (req, res) => {
  req.log.info('health.check');
  res.send('Orders API is running');
});

app.use('/orders', ordersRouter);

app.post('/payments', (req, res) => {
  const { orderId, amount } = req.body || {};
  req.log.info({ orderId: orderId || 8841, amount }, 'payment.started');
  processPayment(req.log, { orderId: orderId || 8841, amount });
  res.send('Payment processed');
});

app.get('/simulate-error', (req, res) => {
  const err = new Error('Simulated database connection failure during payment processing');
  req.log.error({ error: err.message, stack: err.stack, orderId: 8841, waitMs: 8100, component: 'payment-gateway' }, 'payment.failed');
  res.status(500).send('Internal Server Error');
});

app.listen(port, () => {
  logger.info({ port }, 'server.started');
});

