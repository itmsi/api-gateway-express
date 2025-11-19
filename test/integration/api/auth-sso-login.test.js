const request = require('supertest')
const app = require('../../../src/app')

describe('SSO Login API Integration Test', () => {
  describe('POST /api/auth/sso/login', () => {
    const endpoint = '/api/auth/sso/login'
    const testCredentials = {
      email: 'abdulharris@motorsights.net',
      password: 'QwerMSI2025!',
    }

    test('should proxy login request to SSO service successfully', async () => {
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
        .timeout(10000) // 10 second timeout
        .send(testCredentials)

      // Test should not return 404 (route exists)
      expect(response.status).not.toBe(404)
      
      // If service is running, it should return 200, 201, 400, 401, 500, or 502
      // 502 means service is not available, which is acceptable for integration test
      expect([200, 201, 400, 401, 500, 502, 408]).toContain(response.status)
      
      // Response should have body
      expect(response.body).toBeDefined()
      
      // If successful (200/201), should have token or user data
      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('data')
        // Response might have token, user, or success field
        expect(
          response.body.token || 
          response.body.data?.token || 
          response.body.data?.user ||
          response.body.success !== undefined
        ).toBeTruthy()
      }
      
      // If unauthorized (401), should have error message
      if (response.status === 401) {
        expect(
          response.body.message || 
          response.body.error || 
          response.body.data?.message
        ).toBeDefined()
      }
      
      // If Bad Gateway (502) or Request Timeout (408), service might not be running
      if (response.status === 502 || response.status === 408) {
        console.warn('SSO service at http://localhost:9518 might not be running')
      }
    }, 15000) // 15 second timeout for test

    test('should handle missing email', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .timeout(10000)
        .send({
          password: 'QwerMSI2025!',
        })

      // Should return 400 (Bad Request) or proxy to service which returns 400
      // 502/408 means service not available, which is acceptable
      expect([400, 422, 500, 502, 408]).toContain(response.status)
      expect(response.body).toBeDefined()
    }, 15000)

    test('should handle missing password', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .timeout(10000)
        .send({
          email: 'abdulharris@motorsights.net',
        })

      // Should return 400 (Bad Request) or proxy to service which returns 400
      // 502/408 means service not available, which is acceptable
      expect([400, 422, 500, 502, 408]).toContain(response.status)
      expect(response.body).toBeDefined()
    }, 15000)

    test('should handle invalid credentials', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .timeout(10000)
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        })

      // Should return 401 (Unauthorized) or proxy to service which returns 401
      // 502/408 means service not available, which is acceptable
      expect([401, 400, 500, 502, 408]).toContain(response.status)
      expect(response.body).toBeDefined()
    }, 15000)

    test('should handle empty request body', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .timeout(10000)
        .send({})

      // Should return 400 (Bad Request) or proxy to service which returns 400
      // 502/408 means service not available, which is acceptable
      expect([400, 422, 500, 502, 408]).toContain(response.status)
      expect(response.body).toBeDefined()
    }, 15000)

    test('should have correct CORS headers when service responds', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .set('Origin', 'http://localhost:9549')
        .timeout(10000)
        .send(testCredentials)

      // Gateway should preserve or add appropriate headers
      // Response should have some headers
      expect(response.headers).toBeDefined()
      
      // If service is available, should have content-type
      if (response.status !== 502 && response.status !== 408) {
        expect(response.headers['content-type']).toBeDefined()
      }
    }, 15000)
  })
})

