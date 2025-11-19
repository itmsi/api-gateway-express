// Load environment variables first
require('dotenv').config()

const http = require('http')
const app = require('./app')
const { logger } = require('./gateway/logger')

// Support both PORT and APP_PORT from .env
const port = Number(process.env.PORT || process.env.APP_PORT || 3000)
const server = http.createServer(app)

// Suppress deprecation warnings from http-proxy dependency
// http-proxy uses util._extend which is deprecated (DEP0060)
// Override process.emitWarning SEBELUM dependency dimuat
const originalEmitWarning = process.emitWarning
process.emitWarning = function(warning, type, code, ctor) {
  // Handle string warning
  if (typeof warning === 'string') {
    if (warning.includes('util._extend') || warning.includes('DEP0060')) {
      return // Suppress
    }
  }
  // Handle object warning
  if (typeof warning === 'object' && warning !== null) {
    if (warning.name === 'DeprecationWarning') {
      if (warning.code === 'DEP0060' || 
          warning.message?.includes('util._extend') ||
          warning.message?.includes('DEP0060')) {
        return // Suppress
      }
    }
  }
  // Handle code parameter
  if (code === 'DEP0060') {
    return // Suppress
  }
  return originalEmitWarning.call(this, warning, type, code, ctor)
}

process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning') {
    // Filter DEP0060 (util._extend) dari http-proxy
    if (warning.code === 'DEP0060' || 
        warning.message?.includes('util._extend') ||
        warning.message?.includes('DEP0060')) {
      // Silently ignore - ini dari dependency http-proxy
      return
    }
  }
  
  logger.warn('Process warning', {
    name: warning.name,
    message: warning.message,
    code: warning.code,
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
  logger.info(`Health check available at http://localhost:${port}/health`)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${port} is already in use. Please use a different port.`)
  } else {
    logger.error('Server error', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    })
  }
  process.exit(1)
})
