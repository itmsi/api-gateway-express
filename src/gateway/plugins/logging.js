const { logger } = require('../logger')

module.exports = (config = {}, context = {}) => (req, res, next) => {
  const start = Date.now()
  const { service } = context
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info('Gateway request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration,
      service: service?.name,
      user_agent: req.headers['user-agent'],
    })
  })

  return next()
}

