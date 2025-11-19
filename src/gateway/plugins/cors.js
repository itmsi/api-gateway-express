const cors = require('cors')
const { logger } = require('../logger')

/**
 * Plugin CORS untuk menangani Cross-Origin Resource Sharing
 * @param {object} config - Konfigurasi CORS dari kong.yml
 * @param {object} context - Konteks plugin (service, route)
 * @returns {function} - Middleware function untuk Express
 */
const corsPlugin = (config = {}, context = {}) => {
  const origins = config.origins || ['*']
  const methods = config.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  const headers = config.headers || ['Content-Type', 'Authorization']
  const exposedHeaders = config.exposed_headers || []
  const credentials = config.credentials !== undefined ? config.credentials : true
  const maxAge = config.max_age || 3600
  const preflightContinue = config.preflight_continue || false

  // Handle wildcard origins dengan credentials
  let originFunction
  if (origins.includes('*')) {
    if (credentials) {
      // Jika credentials true, tidak bisa gunakan '*' - harus return origin yang request
      originFunction = (origin, callback) => {
        // Jika tidak ada origin (same-origin request), allow
        if (!origin) {
          return callback(null, true)
        }
        // Untuk development, allow semua origin jika credentials true
        // Di production, sebaiknya gunakan whitelist spesifik
        callback(null, true)
      }
    } else {
      // Jika credentials false, bisa langsung return true
      originFunction = true
    }
  } else {
    // Whitelist origins
    originFunction = (origin, callback) => {
      if (!origin) {
        // Same-origin request
        return callback(null, true)
      }
      if (origins.includes(origin)) {
        callback(null, true)
      } else {
        logger.warn('CORS: Origin not allowed', { origin, allowed: origins })
        callback(new Error('Not allowed by CORS'))
      }
    }
  }

  const corsOptions = {
    origin: originFunction,
    methods,
    allowedHeaders: headers,
    exposedHeaders,
    credentials,
    maxAge,
    preflightContinue,
    optionsSuccessStatus: 200, // Beberapa browser memerlukan 200 untuk preflight
  }

  logger.info('CORS plugin initialized', {
    origins: origins.includes('*') ? '*' : origins,
    methods,
    credentials,
  })

  return cors(corsOptions)
}

module.exports = corsPlugin

