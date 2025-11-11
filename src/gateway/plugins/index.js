const { logger } = require('../logger')
const jwtAuthPlugin = require('./jwt-auth')
const rateLimitPlugin = require('./rate-limit')
const loggingPlugin = require('./logging')

const registry = {
  'jwt-auth': jwtAuthPlugin,
  'rate-limit': rateLimitPlugin,
  logging: loggingPlugin,
}

const registerPlugin = (name, factory) => {
  registry[name] = factory
}

const resolvePlugins = (pluginConfigs, context) => {
  if (!Array.isArray(pluginConfigs)) {
    return []
  }

  return pluginConfigs.flatMap((pluginConfig) => {
    const pluginName = pluginConfig?.name
    if (!pluginName) {
      return []
    }
    const factory = registry[pluginName]
    if (!factory) {
      logger.warn(`Plugin ${pluginName} is not registered`)
      return []
    }
    const config = pluginConfig?.config || {}
    const middleware = factory(config, context)
    if (!middleware) {
      return []
    }
    return Array.isArray(middleware) ? middleware : [middleware]
  })
}

module.exports = {
  registerPlugin,
  resolvePlugins,
}

