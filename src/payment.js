const { logger } = require('./logger');

const processPayment = (log = logger, context = {}) => {
  log.info(context, 'payment.processing');
  // Simulate some payment processing
  setTimeout(() => {
    log.info(context, 'payment.completed');
  }, 500);
};

module.exports = { processPayment };

