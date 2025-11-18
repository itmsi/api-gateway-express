require('dotenv').config()

const express = require('express')
const compression = require('compression')
const morgan = require('morgan')
const chokidar = require('chokidar')

const { Gateway } = require('./gateway/gateway')
const { logger, stream } = require('./gateway/logger')

const app = express()

const jsonLimit = process.env.JSON_LIMIT || '1mb'

app.set('trust proxy', 1)
app.use(compression())
app.use(express.json({ limit: jsonLimit }))
app.use(express.urlencoded({ extended: true, limit: jsonLimit }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream }))

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Debug endpoint to check gateway status
app.get('/debug/gateway', (req, res) => {
  const gateway = app.locals.gateway
  if (!gateway) {
    return res.status(500).json({ error: 'Gateway not initialized' })
  }
  
  const config = gateway.getConfig()
  res.json({
    status: 'ok',
    configLoaded: !!config,
    servicesCount: config?.services?.length || 0,
    services: config?.services?.map(s => ({
      name: s.name,
      url: s.url,
      routesCount: s.routes?.length || 0,
    })) || [],
  })
})

const gateway = new Gateway(app, { configPath: process.env.GATEWAY_CONFIG || 'kong.yml' })

try {
  gateway.load()
  logger.info('Gateway configuration loaded successfully')
} catch (error) {
  logger.error('Failed to load gateway configuration', {
    error: error.message,
    stack: error.stack,
  })
  process.exit(1)
}

app.locals.gateway = gateway

const attachAdminRoutes = (config) => {
  if (!config?.admin?.enabled) {
    return
  }

  const adminRouter = express.Router()
  const basePath = config.admin.base_path || '/admin'
  const authConfig = config.admin.auth || { type: 'none' }

  adminRouter.use((req, res, next) => {
    if (authConfig.type === 'basic') {
      const authHeader = req.headers.authorization || ''
      const token = authHeader.split(' ')[1] || ''
      const credentials = Buffer.from(token, 'base64').toString('utf8')
      const [username, password] = credentials.split(':')
      const expectedUsername = authConfig.username || process.env.ADMIN_USER
      const expectedPassword = authConfig.password || process.env.ADMIN_PASS
      if (username !== expectedUsername || password !== expectedPassword) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"')
        return res.status(401).json({ message: 'Unauthorized' })
      }
    } else if (authConfig.type === 'token') {
      const token = req.headers['x-admin-token'] || req.query.token
      const expectedToken = authConfig.token || process.env.ADMIN_TOKEN
      if (!expectedToken || token !== expectedToken) {
        return res.status(401).json({ message: 'Unauthorized' })
      }
    }
    return next()
  })

  adminRouter.post('/reload', (req, res) => {
    try {
      gateway.load()
      res.json({ message: 'Configuration reloaded successfully' })
    } catch (error) {
      logger.error('Failed to reload configuration', { error: error.message })
      res.status(500).json({ message: 'Failed to reload configuration' })
    }
  })

  adminRouter.get('/config', (req, res) => {
    res.json({ config: gateway.getConfig() })
  })

  app.use(basePath, adminRouter)
  logger.info(`Admin API mounted at ${basePath}`)
}

attachAdminRoutes(gateway.getConfig())

const startWatcher = (config) => {
  if (!config?.watcher?.enabled) {
    return
  }

  const debounce = (fn, wait) => {
    let timeout
    return (...args) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => fn(...args), wait)
    }
  }

  const debounceTime = Number(config.watcher.debounce || 500)
  const watcher = chokidar.watch(config.path, { ignoreInitial: true })
  const reload = debounce(() => {
    try {
      gateway.load()
      logger.info('Gateway configuration reloaded via watcher')
    } catch (error) {
      logger.error('Watcher failed to reload configuration', { error: error.message })
    }
  }, debounceTime)

  watcher.on('change', reload)
  watcher.on('error', (error) => {
    logger.error('Watcher error', { error: error.message })
  })

  app.on('close', () => watcher.close())
  logger.info('Configuration watcher started')
}

startWatcher(gateway.getConfig())

module.exports = app
