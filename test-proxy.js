/**
 * Test script untuk mengecek apakah proxy middleware bekerja dengan benar
 * 
 * Cara menjalankan:
 * node test-proxy.js
 */

const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const axios = require('axios')

const app = express()
const PORT = 9599 // Port berbeda untuk test

app.use(express.json())

// Test endpoint untuk hit langsung tanpa proxy
app.post('/test/direct', async (req, res) => {
  console.log('📤 Test direct API call (tanpa proxy)')
  try {
    const response = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:9518/api/auth/sso/login',
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
      validateStatus: () => true,
    })
    console.log('✅ Direct API call berhasil:', response.status)
    res.json({
      success: true,
      method: 'direct',
      status: response.status,
      data: response.data,
    })
  } catch (error) {
    console.log('❌ Direct API call gagal:', error.message)
    res.status(500).json({
      success: false,
      method: 'direct',
      error: error.message,
      code: error.code,
    })
  }
})

// Test endpoint dengan proxy middleware
const proxyMiddleware = createProxyMiddleware({
  target: 'http://127.0.0.1:9518',
  changeOrigin: true,
  secure: false,
  xfwd: true,
  logLevel: 'info',
  logProvider: () => ({
    log: (...args) => console.log('🔵 http-proxy:', ...args),
    debug: (...args) => console.log('🔵 http-proxy:', ...args),
    info: (...args) => console.log('🔵 http-proxy:', ...args),
    warn: (...args) => console.warn('🟡 http-proxy:', ...args),
    error: (...args) => console.error('🔴 http-proxy:', ...args),
  }),
  onProxyReq: (proxyReq, req, res) => {
    console.log('✅ onProxyReq called - Proxy melakukan request!')
    console.log('   Target:', proxyReq.path)
    console.log('   Method:', proxyReq.method)
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('✅ onProxyRes called - Proxy menerima response!')
    console.log('   Status:', proxyRes.statusCode)
  },
  onError: (err, req, res) => {
    console.error('❌ onError called - Proxy error!')
    console.error('   Error:', err.message)
    console.error('   Code:', err.code)
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        method: 'proxy',
        error: err.message,
        code: err.code,
      })
    }
  },
})

app.post('/test/proxy', (req, res, next) => {
  console.log('📤 Test dengan proxy middleware')
  console.log('   Request body:', req.body)
  proxyMiddleware(req, res, next)
})

// Test endpoint untuk test dari luar
app.post('/test/endpoint', async (req, res) => {
  console.log('\n🧪 ===== TEST PROXY =====')
  console.log('Request received:', req.body)
  
  // Test 1: Direct call
  console.log('\n📋 Test 1: Direct API call')
  try {
    const directResponse = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:9518/api/auth/sso/login',
      data: req.body,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
      validateStatus: () => true,
    })
    console.log('✅ Direct call berhasil:', directResponse.status)
  } catch (error) {
    console.log('❌ Direct call gagal:', error.message)
  }
  
  // Test 2: Proxy call (akan di-handle oleh proxy middleware di route /test/proxy)
  res.json({
    message: 'Test endpoint - gunakan /test/direct atau /test/proxy',
    instructions: {
      direct: 'POST /test/direct - Test tanpa proxy',
      proxy: 'POST /test/proxy - Test dengan proxy',
    },
  })
})

app.listen(PORT, () => {
  console.log('\n🚀 Test Proxy Server running on http://localhost:' + PORT)
  console.log('\n📝 Endpoints:')
  console.log('   POST http://localhost:' + PORT + '/test/direct - Test tanpa proxy')
  console.log('   POST http://localhost:' + PORT + '/test/proxy - Test dengan proxy')
  console.log('   POST http://localhost:' + PORT + '/test/endpoint - Info endpoint')
  console.log('\n💡 Contoh test:')
  console.log('   curl -X POST http://localhost:' + PORT + '/test/direct \\')
  console.log('     -H "Content-Type: application/json" \\')
  console.log('     -d \'{"email":"test@example.com","password":"test"}\'')
  console.log('\n   curl -X POST http://localhost:' + PORT + '/test/proxy \\')
  console.log('     -H "Content-Type: application/json" \\')
  console.log('     -d \'{"email":"test@example.com","password":"test"}\'')
  console.log('\n⏳ Waiting for requests...\n')
})

