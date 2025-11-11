const IORedis = require('ioredis')
const { logger } = require('./logger')

let client

const getRedisConfig = (config) => ({
  host: config?.host || process.env.REDIS_HOST || '127.0.0.1',
  port: config?.port || Number(process.env.REDIS_PORT || 6379),
  password: config?.password || process.env.REDIS_PASSWORD,
  db: config?.db || Number(process.env.REDIS_DB || 0),
  enableOfflineQueue: config?.enableOfflineQueue ?? false,
})

const getRedisClient = (config = {}) => {
  if (client) {
    return client
  }
  const options = getRedisConfig(config)
  client = new IORedis(options)

  client.on('error', (error) => {
    logger.error('Redis error', { error: error.message })
  })

  client.on('connect', () => {
    logger.info('Redis connected for rate limiting')
  })

  return client
}

module.exports = {
  getRedisClient,
}

