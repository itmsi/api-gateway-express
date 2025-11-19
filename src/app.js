require('dotenv').config()

const express = require('express')
const compression = require('compression')
const morgan = require('morgan')
const chokidar = require('chokidar')
const axios = require('axios')

const { Gateway } = require('./gateway/gateway')
const { logger, stream } = require('./gateway/logger')

const app = express()

const jsonLimit = process.env.JSON_LIMIT || '1mb'

app.set('trust proxy', 1)
app.use(compression())

// Conditional body parsing - skip untuk route proxy agar body stream tetap readable
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/test/proxy-static')) {
    return next()
  }
  express.json({ limit: jsonLimit })(req, res, next)
})

app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/test/proxy-static')) {
    return next()
  }
  express.urlencoded({ extended: true, limit: jsonLimit })(req, res, next)
})

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream }))

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    host: req.headers.host,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  })
  next()
})

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

// Test endpoint dengan proxy statis untuk debugging
const { createProxyMiddleware } = require('http-proxy-middleware')

const staticProxy = createProxyMiddleware({
  target: 'http://127.0.0.1:9518',
  changeOrigin: true,
  secure: false,
  xfwd: true,
  logLevel: 'silent',
  timeout: 30000,
  proxyTimeout: 30000,
  pathRewrite: {
    '^/test/proxy-static': '',
  },
  onError: (err, req, res) => {
    logger.error('Static proxy error', {
      message: err.message,
      code: err.code,
      path: req.originalUrl,
    })
    if (!res.headersSent) {
      let statusCode = 502
      if (err.code === 'ECONNREFUSED') {
        statusCode = 503
      } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
        statusCode = 504
      }
      res.status(statusCode).json({
        error: 'Proxy error',
        message: err.message,
        code: err.code,
      })
    }
  },
})

app.use('/test/proxy-static', staticProxy)

// Test endpoint untuk hit langsung ke API destinasi tanpa proxy
app.post('/test/direct-api', async (req, res) => {
  const targetUrl = req.query.url || 'http://127.0.0.1:9518/api/auth/sso/login'
  
  try {
    const response = await axios({
      method: 'POST',
      url: targetUrl,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers,
      },
      timeout: 60000,
      validateStatus: () => true,
    })
    
    res.status(response.status).json(response.data)
  } catch (error) {
    logger.error('Direct API call failed', {
      targetUrl,
      error: error.message,
      code: error.code,
    })
    
    let statusCode = 500
    let errorMessage = 'Internal Server Error'
    
    if (error.code === 'ECONNREFUSED') {
      statusCode = 503
      errorMessage = `Service tidak berjalan. Connection refused to ${targetUrl}`
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      statusCode = 504
      errorMessage = `Service timeout. The service at ${targetUrl} did not respond in time.`
    } else if (error.code === 'ENOTFOUND') {
      statusCode = 502
      errorMessage = `Host not found: ${targetUrl}`
    } else {
      errorMessage = error.message
    }
    
    res.status(statusCode).json({
      error: errorMessage,
      code: error.code || 'UNKNOWN',
      target: targetUrl,
    })
  }
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

// 404 handler for unmatched routes
app.use((req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    host: req.headers.host,
  })
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: ['/health', '/debug/gateway', '/admin/reload', '/admin/config'],
  })
})

// Error handler
app.use((err, req, res, next) => {
  logger.error('Application error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
  })
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message,
  })
})

module.exports = app
