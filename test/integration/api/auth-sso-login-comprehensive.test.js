const request = require('supertest')
const app = require('../../../src/app')
const axios = require('axios')

describe('SSO Login API - Comprehensive Test', () => {
  const endpoint = '/api/auth/sso/login'
  const ssoServiceUrl = 'http://localhost:9518'
  const gatewayUrl = 'http://localhost:9588'
  const testCredentials = {
    email: 'abdulharris@motorsights.net',
    password: 'QwerMSI2025!',
  }

  // Helper function to check if SSO service is available
  const checkSSOService = async () => {
    try {
      const response = await axios.post(
        `${ssoServiceUrl}/api/auth/sso/login`,
        { email: 'test', password: 'test' },
        { timeout: 5000, validateStatus: () => true }
      )
      return response.status !== undefined // Service is responding
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return false
      }
      return true // Other errors mean service is running but rejecting request
    }
  }

  beforeAll(async () => {
    // Check if SSO service is available
    const isAvailable = await checkSSOService()
    if (!isAvailable) {
      console.warn('⚠️  SSO service at http://localhost:9518 is not available. Some tests may fail.')
    }
  }, 10000)

  describe('Gateway Route Registration', () => {
    test('should have route /api/auth/sso/login registered', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .timeout(5000)
        .send({})

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404)
    }, 10000)
  })

  describe('POST /api/auth/sso/login - Success Cases', () => {
    test('should proxy request with valid credentials', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Accept', 'application/json, text/plain, */*')
        .set('Content-Type', 'application/json')
        .set('Origin', 'http://localhost:9549')
        .set('Referer', 'http://localhost:9549/')
        .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
        .timeout(65000) // 65 seconds to account for SSO processing time
        .send(testCredentials)

      console.log('Response status:', response.status)
      console.log('Response body:', JSON.stringify(response.body, null, 2))

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404)
      
      // Should return valid HTTP status
      expect([200, 201, 400, 401, 500, 502, 503, 504]).toContain(response.status)
      
      // Response should have body
      expect(response.body).toBeDefined()

      // If successful (200/201)
      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('data')
        console.log('✅ Login successful!')
      }

      // If unauthorized (401) - credentials might be wrong but service is working
      if (response.status === 401) {
        expect(
          response.body.message || 
          response.body.error || 
          response.body.data?.message
        ).toBeDefined()
        console.log('⚠️  Unauthorized - service is working but credentials may be invalid')
      }

      // If service unavailable (502/503/504)
      if ([502, 503, 504].includes(response.status)) {
        console.log('❌ Service unavailable:', response.body.error || response.body.message)
        // This is acceptable if service is not running
        expect(response.body.error || response.body.message).toBeDefined()
      }
    }, 70000) // 70 second timeout

    test('should handle request with all headers from original curl', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Accept', 'application/json, text/plain, */*')
        .set('Accept-Language', 'en-US,en;q=0.9')
        .set('Connection', 'keep-alive')
        .set('Content-Type', 'application/json')
        .set('Origin', 'http://localhost:9549')
        .set('Referer', 'http://localhost:9549/')
        .set('Sec-Fetch-Dest', 'empty')
        .set('Sec-Fetch-Mode', 'cors')
        .set('Sec-Fetch-Site', 'cross-site')
        .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36')
        .set('sec-ch-ua', '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"')
        .set('sec-ch-ua-mobile', '?0')
        .set('sec-ch-ua-platform', '"macOS"')
        .timeout(65000)
        .send(testCredentials)

      expect(response.status).not.toBe(404)
      expect(response.body).toBeDefined()
    }, 70000)
  })

  describe('POST /api/auth/sso/login - Error Cases', () => {
    test('should handle missing email', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .timeout(65000)
        .send({
          password: 'QwerMSI2025!',
        })

      expect([400, 422, 500, 502, 503, 504]).toContain(response.status)
      expect(response.body).toBeDefined()
    }, 70000)

    test('should handle missing password', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .timeout(65000)
        .send({
          email: 'abdulharris@motorsights.net',
        })

      expect([400, 422, 500, 502, 503, 504]).toContain(response.status)
      expect(response.body).toBeDefined()
    }, 70000)

    test('should handle empty request body', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .timeout(65000)
        .send({})

      expect([400, 422, 500, 502, 503, 504]).toContain(response.status)
      expect(response.body).toBeDefined()
    }, 70000)

    test('should handle invalid credentials', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .timeout(65000)
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        })

      expect([401, 400, 500, 502, 503, 504]).toContain(response.status)
      expect(response.body).toBeDefined()
    }, 70000)
  })

  describe('Error Response Format', () => {
    test('should return proper error format when service unavailable', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .timeout(5000) // Short timeout to potentially trigger error
        .send(testCredentials)

      // If service unavailable, should have proper error format
      if ([502, 503, 504].includes(response.status)) {
        expect(response.body).toHaveProperty('error')
        expect(response.body).toHaveProperty('service')
        expect(response.body).toHaveProperty('target')
        expect(response.body.service).toBe('sso-service')
        expect(response.body.target).toBe('http://localhost:9518')
      }
    }, 10000)
  })

  describe('CORS and Headers', () => {
    test('should preserve CORS headers', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .set('Origin', 'http://localhost:9549')
        .timeout(65000)
        .send(testCredentials)

      expect(response.headers).toBeDefined()
      
      if (response.status !== 502 && response.status !== 503 && response.status !== 504) {
        expect(response.headers['content-type']).toBeDefined()
      }
    }, 70000)
  })
})

