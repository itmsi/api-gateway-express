const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const { loadConfig } = require('./config-loader')
const { resolvePlugins } = require('./plugins')
const { logger } = require('./logger')

class Gateway {
  constructor(app, options = {}) {
    this.app = app
    this.configPath = options.configPath || process.env.GATEWAY_CONFIG || 'kong.yml'
    this.dynamicRouter = express.Router({ mergeParams: true })
    this.app.use(this.dynamicRouter)
    this.currentConfig = null
  }

  load() {
    this.currentConfig = loadConfig(this.configPath)
    this.applyConfig()
    logger.info('Gateway configuration loaded', {
      services: this.currentConfig.services.length,
    })
    return this.currentConfig
  }

  reload() {
    return this.load()
  }

  getConfig() {
    return this.currentConfig
  }

  clearRoutes() {
    this.dynamicRouter.stack = []
  }

  applyConfig() {
    if (!this.currentConfig) {
      throw new Error('Gateway config is not loaded')
    }
    this.clearRoutes()
    this.currentConfig.services.forEach((service) => {
      this.registerService(service)
    })
  }

  registerService(service) {
    if (!service?.url || !Array.isArray(service.routes)) {
      logger.warn('Invalid service configuration', { service })
      return
    }

    service.routes.forEach((route) => {
      this.registerRoute(service, route)
    })
  }

  registerRoute(service, route) {
    const paths = Array.isArray(route.paths) ? route.paths : []
    if (!paths.length) {
      logger.warn('Route has no paths', { service: service.name })
      return
    }

    const context = { service, route }
    const servicePlugins = resolvePlugins(service.plugins, context)
    const routePlugins = resolvePlugins(route.plugins, context)
    const middlewares = [...servicePlugins, ...routePlugins]

    paths.forEach((routePath) => {
      const proxy = this.createProxy(service, routePath, route)
      const handlers = [...middlewares, proxy]
      if (Array.isArray(route.methods) && route.methods.length > 0) {
        route.methods.forEach((method) => {
          const methodName = method.toLowerCase()
          if (typeof this.dynamicRouter[methodName] === 'function') {
            this.dynamicRouter[methodName](routePath, ...handlers)
          } else {
            logger.warn(`Unsupported HTTP method ${method} for route ${routePath}`)
          }
        })
      } else {
        this.dynamicRouter.use(routePath, ...handlers)
      }
      logger.info('Route registered', {
        service: service.name,
        path: routePath,
        methods: route.methods || 'ALL',
      })
    })
  }

  createProxy(service, routePath, route) {
    const rewrite = this.buildPathRewrite(routePath, route)

    return createProxyMiddleware({
      target: service.url,
      changeOrigin: true,
      ws: true,
      logProvider: () => ({
        log: (...args) => logger.debug(...args),
        debug: (...args) => logger.debug(...args),
        info: (...args) => logger.info(...args),
        warn: (...args) => logger.warn(...args),
        error: (...args) => logger.error(...args),
      }),
      pathRewrite: rewrite,
      onProxyReq: (proxyReq, req) => {
        logger.info('Proxying request', {
          method: req.method,
          originalUrl: req.originalUrl,
          target: service.url,
          service: service.name,
          route: routePath,
        })
        
        if (route?.preserve_host === false) {
          proxyReq.removeHeader('host')
        }
        proxyReq.setHeader('x-forwarded-host', req.headers.host)
        proxyReq.setHeader('x-forwarded-proto', req.protocol)
        proxyReq.setHeader('x-forwarded-for', req.ip)
        proxyReq.setHeader('x-forwarded-path', req.originalUrl)
      },
      onProxyRes: (proxyRes) => {
        proxyRes.headers['x-powered-by'] = 'Express API Gateway'
      },
      onError: (err, req, res) => {
        logger.error('Proxy error', {
          service: service.name,
          target: service.url,
          message: err.message,
        })
        if (!res.headersSent) {
          res.status(502).json({ message: 'Bad Gateway' })
        }
      },
    })
  }

  buildPathRewrite(routePath, route) {
    if (!route.strip_path && !route.rewrite_path) {
      return undefined
    }
    const targetPath = route.rewrite_path || '/'
    const pathRegex = new RegExp(`^${routePath.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}`)
    return (path) => path.replace(pathRegex, targetPath)
  }
}

module.exports = {
  Gateway,
}

