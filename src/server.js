// Load environment variables first
require('dotenv').config()

const http = require('http')
const app = require('./app')
const { logger } = require('./gateway/logger')

// Support both PORT and APP_PORT from .env
const port = Number(process.env.PORT || process.env.APP_PORT || 3000)
const server = http.createServer(app)

process.on('warning', (warning) => {
  logger.warn('Process warning', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack,
  })
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    promise,
  })
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    message: error.message,
    stack: error.stack,
  })
  process.exit(1)
})

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('HTTP server closed')
    process.exit(0)
  })
})

server.listen(port, () => {
  logger.info(`API Gateway listening on port ${port}`)
})
