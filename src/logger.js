const crypto = require('crypto');

class Logger {
  constructor(defaultContext = {}) {
    this.defaultContext = {
      service: process.env.SERVICE_NAME || 'orders-api',
      ...defaultContext,
    };
  }

  child(extraContext = {}) {
    return new Logger({
      ...this.defaultContext,
      ...extraContext,
    });
  }

  _formatAndOutput(level, arg1, arg2) {
    let msg = '';
    let extra = {};

    if (typeof arg1 === 'string') {
      msg = arg1;
      if (typeof arg2 === 'object' && arg2 !== null) {
        extra = { ...arg2 };
      }
    } else if (typeof arg1 === 'object' && arg1 !== null) {
      extra = { ...arg1 };
      if (typeof arg2 === 'string') {
        msg = arg2;
      } else if (extra.msg || extra.message) {
        msg = extra.msg || extra.message;
        delete extra.msg;
        delete extra.message;
      }
    }

    if (extra.error instanceof Error) {
      extra.error = {
        message: extra.error.message,
        name: extra.error.name,
        stack: extra.error.stack,
      };
    }

    const sanitizedExtra = this._sanitizeSecrets(extra);

    const logEntry = {
      ts: new Date().toISOString(),
      level: level.toLowerCase(),
      service: this.defaultContext.service,
      ...this.defaultContext,
      ...sanitizedExtra,
      msg: msg || 'event',
    };

    const output = JSON.stringify(logEntry);
    if (level === 'error') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  _sanitizeSecrets(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const sensitiveKeys = ['password', 'passwd', 'secret', 'token', 'authorization', 'card_number', 'credit_card', 'cvv', 'ssn'];
    const sanitized = Array.isArray(obj) ? [] : {};
    
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(s => lowerKey.includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null && !(obj[key] instanceof Error)) {
        sanitized[key] = this._sanitizeSecrets(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    return sanitized;
  }

  debug(arg1, arg2) {
    this._formatAndOutput('debug', arg1, arg2);
  }

  info(arg1, arg2) {
    this._formatAndOutput('info', arg1, arg2);
  }

  warn(arg1, arg2) {
    this._formatAndOutput('warn', arg1, arg2);
  }

  error(arg1, arg2) {
    this._formatAndOutput('error', arg1, arg2);
  }
}

const defaultLogger = new Logger();

module.exports = {
  Logger,
  logger: defaultLogger,
};

