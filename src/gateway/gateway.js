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
    
    // Apply global plugins to all routes
    const globalPlugins = resolvePlugins(this.currentConfig.plugins || [], {})
    
    // Apply global plugins to all routes via app-level middleware
    if (globalPlugins.length > 0) {
      this.dynamicRouter.use(...globalPlugins)
      logger.info('Global plugins applied', {
        plugins: this.currentConfig.plugins?.map(p => p.name) || [],
      })
    }
    
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

  /**
   * Mendaftarkan route untuk service
   * 
   * @param {object} service - Konfigurasi service dari kong.yml
   * @param {object} route - Konfigurasi route dari kong.yml
   */
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
      
      // Ensure proxy is a function
      if (typeof proxy !== 'function') {
        logger.error('Proxy middleware is not a function', {
          service: service.name,
          routePath,
          proxyType: typeof proxy,
        })
        throw new Error(`Proxy middleware for ${service.name} at ${routePath} is not a function`)
      }
      
      // Body stream masih readable karena body parsing di-skip untuk route proxy di app.js
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

  /**
   * Membuat proxy middleware untuk forward request ke service backend
   * 
   * @param {object} service - Konfigurasi service (name, url, timeout)
   * @param {string} routePath - Path dari konfigurasi route
   * @param {object} route - Konfigurasi route (strip_path, rewrite_path, methods)
   * @returns {function} - Proxy middleware function
   */
  createProxy(service, routePath, route) {
    const rewrite = this.buildPathRewrite(routePath, route)

    // Use timeout from service config (connect_timeout, read_timeout, or write_timeout from kong.yml)
    const timeout = service.timeout || service.connect_timeout || service.read_timeout || service.write_timeout || 60000
    
    // Pastikan target URL menggunakan 127.0.0.1 untuk menghindari masalah IPv6
    const targetUrl = service.url.replace('localhost', '127.0.0.1')
    
    const proxyOptions = {
      target: targetUrl,
      changeOrigin: true,
      ws: true,
      secure: false,
      proxyTimeout: timeout,
      timeout: timeout,
      xfwd: true,
      followRedirects: true,
      logLevel: 'silent',
      selfHandleResponse: false,
      onProxyReq: (proxyReq, req, res) => {
        logger.info('Proxy request', {
          method: req.method,
          path: req.originalUrl,
          target: `${service.url}${proxyReq.path}`,
          service: service.name,
        })
        
        if (route?.preserve_host === false) {
          proxyReq.removeHeader('host')
        }
        proxyReq.setHeader('x-forwarded-host', req.headers.host)
        proxyReq.setHeader('x-forwarded-proto', req.protocol)
        proxyReq.setHeader('x-forwarded-for', req.ip)
        proxyReq.setHeader('x-forwarded-path', req.originalUrl)
      },
      onProxyRes: (proxyRes, req, res) => {
        logger.info('Proxy response', {
          statusCode: proxyRes.statusCode,
          service: service.name,
          path: req.originalUrl,
        })
        proxyRes.headers['x-powered-by'] = 'Express API Gateway'
      },
      onError: (err, req, res) => {
        logger.error('Proxy error', {
          service: service.name,
          target: service.url,
          message: err.message,
          code: err.code,
          path: req.originalUrl,
        })
        
        if (!res.headersSent) {
          let statusCode = 502
          let errorMessage = 'Bad Gateway'
          
          if (err.code === 'ECONNREFUSED') {
            statusCode = 503
            errorMessage = `Service ${service.name} is not available. Connection refused to ${service.url}. Please check if the service is running.`
          } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
            statusCode = 504
            errorMessage = `Service ${service.name} timeout. The service at ${service.url} did not respond in time.`
          } else if (err.code === 'ENOTFOUND') {
            statusCode = 502
            errorMessage = `Service ${service.name} host not found: ${service.url}`
          } else {
            errorMessage = `Error occurred while trying to proxy to ${service.name}: ${err.message}`
          }
          
          res.status(statusCode).json({ 
            error: errorMessage,
            service: service.name,
            target: service.url,
            code: err.code || 'UNKNOWN',
          })
        }
      },
    }
    
    // Hanya tambahkan pathRewrite jika ada rewrite function
    if (rewrite) {
      proxyOptions.pathRewrite = rewrite
    }
    
    return createProxyMiddleware(proxyOptions)
  }

  /**
   * Membangun fungsi path rewrite untuk proxy middleware
   * 
   * @param {string} routePath - Path dari konfigurasi route
   * @param {object} route - Konfigurasi route (strip_path, rewrite_path)
   * @returns {function|undefined} - Fungsi path rewrite atau undefined jika tidak perlu rewrite
   */
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

