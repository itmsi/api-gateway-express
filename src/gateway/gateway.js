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

  /**
   * Mendaftarkan route untuk service
   * 
   * Logika routing:
   * 1. Request masuk: http://localhost:9588/api/auth/sso/login
   * 2. Gateway match path dengan route di kong.yml
   * 3. Ditemukan di service sso-service (URL: http://localhost:9518)
   * 4. Karena strip_path: false, path tetap /api/auth/sso/login
   * 5. Request di-forward ke: http://localhost:9518/api/auth/sso/login
   * 6. Response dari service dikembalikan ke client
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
      
      // Tambahkan logging middleware untuk tracking
      const routeLogging = (req, res, next) => {
        logger.info('🔵 Route handler dipanggil', {
          method: req.method,
          path: req.path,
          originalUrl: req.originalUrl,
          routePath,
          service: service.name,
          target: service.url,
          handlersCount: middlewares.length + 1, // +1 for proxy
        })
        next()
      }
      
      // Logging sebelum proxy untuk memastikan proxy akan dipanggil
      const beforeProxy = (req, res, next) => {
        logger.info('🟡 Sebelum proxy middleware', {
          method: req.method,
          path: req.path,
          service: service.name,
        })
        next()
      }
      
      // Wrapper proxy dengan logging dan body handling
      const proxyWithLogging = (req, res, next) => {
        logger.info('🟢 Memanggil proxy middleware function', {
          method: req.method,
          path: req.path,
          service: service.name,
          proxyType: typeof proxy,
          isFunction: typeof proxy === 'function',
          hasBody: !!req.body,
          bodyType: req.body ? typeof req.body : 'undefined',
        })
        
        // Pastikan proxy adalah function
        if (typeof proxy !== 'function') {
          logger.error('Proxy is not a function!', {
            proxyType: typeof proxy,
            service: service.name,
          })
          return res.status(500).json({ error: 'Proxy middleware error' })
        }
        
        // PENTING: Body stream sekarang masih readable karena kita skip body parsing
        // untuk route proxy di app.js. Jadi proxy bisa membaca body stream langsung.
        // Tidak perlu restore stream atau rewrite body.
        logger.debug('Body stream status untuk proxy', {
          hasBody: !!req.body,
          readable: req.readable,
          method: req.method,
          service: service.name,
        })
        
        // Panggil proxy middleware
        try {
          const result = proxy(req, res, next)
          logger.info('🟢 Proxy middleware dipanggil, return value:', {
            resultType: typeof result,
            service: service.name,
          })
          return result
        } catch (error) {
          logger.error('Error saat memanggil proxy', {
            error: error.message,
            stack: error.stack,
            service: service.name,
          })
          if (!res.headersSent) {
            res.status(500).json({ error: 'Proxy error', message: error.message })
          }
        }
      }
      
      // Gunakan proxy langsung seperti di test-proxy.js yang berhasil
      // http-proxy-middleware akan menangani request/response secara langsung
      const handlers = [routeLogging, ...middlewares, beforeProxy, proxyWithLogging]
      
      if (Array.isArray(route.methods) && route.methods.length > 0) {
        route.methods.forEach((method) => {
          const methodName = method.toLowerCase()
          if (typeof this.dynamicRouter[methodName] === 'function') {
            logger.debug('Registering route', {
              method: methodName,
              routePath,
              service: service.name,
            })
            this.dynamicRouter[methodName](routePath, ...handlers)
          } else {
            logger.warn(`Unsupported HTTP method ${method} for route ${routePath}`)
          }
        })
      } else {
        logger.debug('Registering route (all methods)', {
          routePath,
          service: service.name,
        })
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
      logLevel: 'debug', // Set ke debug untuk melihat apa yang terjadi
      logProvider: () => ({
        log: (...args) => logger.debug('[PROXY-LOG]', ...args),
        debug: (...args) => logger.debug('[PROXY-DEBUG]', ...args),
        info: (...args) => logger.info('[PROXY-INFO]', ...args),
        warn: (...args) => logger.warn('[PROXY-WARN]', ...args),
        error: (...args) => logger.error('[PROXY-ERROR]', ...args),
      }),
      // Jangan gunakan filter - biarkan Express router yang handle path matching
      // Penting: selfHandleResponse harus false agar proxy bisa handle response
      selfHandleResponse: false,
      // PENTING: Jika body sudah di-parse, kita perlu rewrite body di onProxyReq
      // Tapi onProxyReq hanya dipanggil jika proxy benar-benar membuat request
      // Masalahnya mungkin body stream sudah di-consume, jadi proxy tidak bisa membuat request
      onProxyReq: (proxyReq, req, res) => {
        logger.info('✅ PROXY REQUEST: Mengirim ke API destinasi', {
          method: req.method,
          originalUrl: req.originalUrl,
          target: `${service.url}${proxyReq.path}`,
          service: service.name,
          fullUrl: `${service.url}${proxyReq.path}`,
          proxyPath: proxyReq.path,
          hasBody: !!req.body,
          bodyKeys: req.body ? Object.keys(req.body) : [],
        })
        
        // Body stream masih readable karena kita skip body parsing untuk route proxy
        // http-proxy-middleware akan membaca body stream langsung
        // Tidak perlu rewrite body karena stream masih intact
        logger.debug('Proxy request headers set', {
          method: req.method,
          hasContentLength: !!req.headers['content-length'],
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
        logger.info('✅ PROXY RESPONSE: Diterima dari API destinasi', {
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
   * Logika:
   * - Jika strip_path: false dan tidak ada rewrite_path, path tidak diubah (return undefined)
   *   Contoh: /api/auth/sso/login -> tetap /api/auth/sso/login
   * - Jika strip_path: true, path di-strip (diganti dengan '/')
   *   Contoh: /api/v1/example -> /
   * - Jika ada rewrite_path, path di-rewrite sesuai rewrite_path
   *   Contoh: /api/v1/example -> /v2/example (jika rewrite_path: /v2/example)
   * 
   * @param {string} routePath - Path dari konfigurasi route
   * @param {object} route - Konfigurasi route (strip_path, rewrite_path)
   * @returns {function|undefined} - Fungsi path rewrite atau undefined jika tidak perlu rewrite
   */
  buildPathRewrite(routePath, route) {
    // Jika strip_path: false dan tidak ada rewrite_path, path tetap sama
    // Request: http://localhost:9588/api/auth/sso/login
    // Forward ke: http://localhost:9518/api/auth/sso/login (path tetap sama)
    if (!route.strip_path && !route.rewrite_path) {
      return undefined
    }
    
    // Jika strip_path: true, path di-strip menjadi '/'
    // Jika ada rewrite_path, gunakan rewrite_path sebagai target
    const targetPath = route.rewrite_path || '/'
    
    // Escape special characters untuk regex
    const pathRegex = new RegExp(`^${routePath.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}`)
    
    // Return fungsi yang akan mengganti path sesuai regex
    return (path) => path.replace(pathRegex, targetPath)
  }
}

module.exports = {
  Gateway,
}

