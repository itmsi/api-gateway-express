const {
  RateLimiterMemory,
  RateLimiterRedis,
} = require('rate-limiter-flexible')
const { getRedisClient } = require('../redis-client')
const { logger } = require('../logger')

const createKey = (req, config = {}) => {
  if (config.key && typeof config.key === 'function') {
    return config.key(req)
  }
  if (config.key_type === 'header' && config.key_name) {
    return req.headers[config.key_name.toLowerCase()] || req.ip
  }
  if (config.key_type === 'query' && config.key_name) {
    return req.query?.[config.key_name] || req.ip
  }
  if (config.key_type === 'body' && config.key_name) {
    return req.body?.[config.key_name] || req.ip
  }
  return req.ip
}

const buildLimiter = (config = {}) => {
  const limiterOptions = {
    points: Number(config.points || 10),
    duration: Number(config.duration || 60),
    blockDuration: Number(config.block_duration || 0),
    keyPrefix: config.key_prefix || 'gateway',
  }
  if (config.policy === 'redis') {
    const redisClient = getRedisClient(config.redis || {})
    return new RateLimiterRedis({
      storeClient: redisClient,
      ...limiterOptions,
    })
  }
  return new RateLimiterMemory(limiterOptions)
}

module.exports = (config = {}, context = {}) => {
  const limiter = buildLimiter(config)
  const { service } = context

  return async (req, res, next) => {
    try {
      const key = createKey(req, config)
      await limiter.consume(key)
      return next()
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Rate limiter error', {
          service: service?.name,
          message: error.message,
        })
        return res.status(500).json({ message: 'Rate limiter error' })
      }
      const retryAfter = Math.ceil(error.msBeforeNext / 1000) || 1
      res.setHeader('Retry-After', retryAfter)
      return res.status(429).json({ message: 'Too Many Requests' })
    }
  }
}

