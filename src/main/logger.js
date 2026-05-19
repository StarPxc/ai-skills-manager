const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_PATH = path.join(os.homedir(), '.ai-skills-manager.log');
const MAX_LOG_SIZE = 2 * 1024 * 1024; // 2MB

function timestamp() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

function rotateLog() {
  if (fs.existsSync(LOG_PATH) && fs.statSync(LOG_PATH).size > MAX_LOG_SIZE) {
    const bak = LOG_PATH + '.' + Date.now() + '.bak';
    fs.renameSync(LOG_PATH, bak);
  }
}

function write(level, ...args) {
  try {
    rotateLog();
    const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    const line = `[${timestamp()}] [${level}] ${msg}\n`;
    fs.appendFileSync(LOG_PATH, line);
  } catch {
    // silently fail logging
  }
}

module.exports = {
  info: (...args) => write('INFO', ...args),
  warn: (...args) => write('WARN', ...args),
  error: (...args) => write('ERROR', ...args),
  debug: (...args) => write('DEBUG', ...args),
  getPath: () => LOG_PATH,
};
