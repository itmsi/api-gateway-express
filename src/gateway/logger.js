const winston = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file')
const path = require('path')
const fs = require('fs')

const LOG_DIR = process.env.LOG_DIRECTORY || path.resolve(process.cwd(), 'logs', 'gateway')

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

const transports = [
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    handleExceptions: true,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
        return `${timestamp} [${level}]: ${message}${metaString}`
      })
    ),
  }),
  new DailyRotateFile({
    dirname: LOG_DIR,
    filename: 'gateway-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  }),
]

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports,
  exitOnError: false,
})

const stream = {
  write: (message) => logger.info(message.trim()),
}

module.exports = {
  logger,
  stream,
}

