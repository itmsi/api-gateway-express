const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { logger } = require('./logger')

const ENV_PATTERN = /\$\{([^}]+)}/g

const resolveEnv = (value) => {
  if (typeof value !== 'string') {
    return value
  }

  return value.replace(ENV_PATTERN, (match, expression) => {
    const [key, defaultValue] = expression.split(':-')
    const envValue = process.env[key]
    if (envValue && envValue.length > 0) {
      return envValue
    }
    if (typeof defaultValue !== 'undefined') {
      return defaultValue
    }
    logger.warn(`Environment variable ${key} is not set for expression ${match}`)
    return ''
  })
}

const normalizeRoute = (route) => {
  const paths = Array.isArray(route?.paths) ? route.paths : []

  return {
    paths,
    methods: route?.methods,
    strip_path: route?.strip_path ?? false,
    rewrite_path: route?.rewrite_path,
    plugins: Array.isArray(route?.plugins) ? route.plugins : [],
  }
}

const normalizeService = (service) => ({
  name: service?.name,
  url: service?.url,
  routes: Array.isArray(service?.routes) ? service.routes.map(normalizeRoute) : [],
  plugins: Array.isArray(service?.plugins) ? service.plugins : [],
})

const applyEnv = (object) => {
  if (Array.isArray(object)) {
    return object.map(applyEnv)
  }
  if (object && typeof object === 'object') {
    return Object.entries(object).reduce((acc, [key, val]) => {
      acc[key] = applyEnv(val)
      return acc
    }, {})
  }
  return resolveEnv(object)
}

const loadConfig = (configPath) => {
  const absolutePath = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(process.cwd(), configPath)

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found at ${absolutePath}`)
  }

  const doc = yaml.load(fs.readFileSync(absolutePath, 'utf8'))
  const config = applyEnv(doc)

  if (!Array.isArray(config?.services)) {
    throw new Error('Config file must contain a services array')
  }

  const services = config.services.map(normalizeService)

  return {
    services,
    admin: config?.admin || {},
    watcher: config?.watcher || {},
    raw: config,
    path: absolutePath,
  }
}

module.exports = {
  loadConfig,
}

