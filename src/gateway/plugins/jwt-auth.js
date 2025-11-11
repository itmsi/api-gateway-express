const jwt = require('jsonwebtoken')
const { logger } = require('../logger')

module.exports = (config = {}, context = {}) => {
  const secret = config.secret || process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT secret is not configured. Set JWT_SECRET env or provide config.secret')
  }

  const { service, route } = context

  return (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      logger.warn('JWT missing', { path: req.path, service: service?.name })
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, secret, config.verifyOptions || {})
      if (config.forward_payload_as) {
        const headerKey = config.forward_payload_as.toLowerCase()
        req.headers[headerKey] = JSON.stringify(decoded)
      } else if (config.forward_payload_header) {
        req.headers[config.forward_payload_header.toLowerCase()] = JSON.stringify(decoded)
      } else {
        req.user = decoded
      }
      return next()
    } catch (error) {
      logger.warn('JWT verification failed', {
        service: service?.name,
        route: route?.paths,
        error: error.message,
      })
      return res.status(401).json({ message: 'Invalid token' })
    }
  }
}

