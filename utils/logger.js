// Lightweight logging utility for the blog application
// Uses console methods with structured formatting for better debugging

const getTimestamp = () => {
  return new Date().toISOString();
};

const formatMessage = (level, ...args) => {
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] [${level}]`;
  return [prefix, ...args];
};

export const log = (...args) => {
  console.log(...formatMessage('LOG', ...args));
};

export const info = (...args) => {
  console.info(...formatMessage('INFO', ...args));
};

export const warn = (...args) => {
  console.warn(...formatMessage('WARN', ...args));
};

export const error = (...args) => {
  console.error(...formatMessage('ERROR', ...args));
};

export const debug = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.debug(...formatMessage('DEBUG', ...args));
  }
};

// Log request information for debugging
export const logRequest = (req, res, next) => {
  const start = Date.now();
  const { method, url, ip } = req;
  
  log(`${method} ${url} - ${ip}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    log(`${method} ${url} - ${statusCode} - ${duration}ms`);
  });
  
  next();
};

export default { log, info, warn, error, debug, logRequest }; 