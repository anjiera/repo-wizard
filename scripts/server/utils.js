'use strict';

const net = require('net');

function writeLog(level, message, correlationId = '', extra = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    correlation_id: correlationId,
    message,
    ...extra
  };
  console.log(JSON.stringify(logEntry));
}

/**
 * Searches for an open port using the native net package
 */
function findOpenPort(startPort, callback) {
  if (startPort > 65535) {
    callback(new Error('No open ports found in range 3000-65535'));
    return;
  }
  const server = net.createServer();
  server.listen(startPort, '127.0.0.1', () => {
    server.once('close', () => callback(null, startPort));
    server.close();
  });
  server.on('error', () => {
    findOpenPort(startPort + 1, callback);
  });
}

module.exports = {
  writeLog,
  findOpenPort
};
