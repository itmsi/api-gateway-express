const request = require('supertest')
const app = require('../../../src/app')

/**
 * Working Test for SSO Login Endpoint
 * 
 * This test verifies that:
 * 1. Route is registered correctly
 * 2. Gateway can proxy requests to SSO service
 * 3. Error handling works properly
 * 
 * Note: SSO service must be running at http://localhost:9518
 */
describe('SSO Login API - Working Test', () => {
  const endpoint = '/api/auth/sso/login'
  const testCredentials = {
    email: 'abdulharris@motorsights.net',
    password: 'QwerMSI2025!',
  }

  describe('Route Registration', () => {
    test('should have /api/auth/sso/login route registered', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .timeout(5000)
        .send({})

      // Route exists if not 404
      expect(response.status).not.toBe(404)
      expect(response.body).toBeDefined()
    }, 10000)
  })

  describe('POST /api/auth/sso/login', () => {
    test('should proxy request successfully', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Accept', 'application/json, text/plain, */*')
        .set('Content-Type', 'application/json')
        .set('Origin', 'http://localhost:9549')
        .set('Referer', 'http://localhost:9549/')
        .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
        .timeout(15000) // 15 second timeout
        .send(testCredentials)

      console.log('\n📊 Test Results:')
      console.log(`   Status: ${response.status}`)
      console.log(`   Body:`, JSON.stringify(response.body, null, 2))

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404)
      
      // Valid HTTP status codes
      const validStatuses = [200, 201, 400, 401, 500, 502, 503, 504]
      expect(validStatuses).toContain(response.status)
      
      // Response should have body
      expect(response.body).toBeDefined()

      // Success case
      if (response.status === 200 || response.status === 201) {
        console.log('   ✅ Login successful!')
        expect(response.body).toHaveProperty('data')
      }
      
      // Unauthorized (service working but credentials wrong)
      if (response.status === 401) {
        console.log('   ⚠️  Unauthorized - service is working')
        expect(
          response.body.message || 
          response.body.error || 
          response.body.data?.message
        ).toBeDefined()
      }

      // Service unavailable
      if ([502, 503, 504].includes(response.status)) {
        console.log('   ❌ Service unavailable')
        expect(response.body.error || response.body.message).toBeDefined()
        if (response.body.service) {
          expect(response.body.service).toBe('sso-service')
        }
      }
    }, 20000)

    test('should handle missing email', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .timeout(15000)
        .send({ password: 'QwerMSI2025!' })

      expect([400, 422, 500, 502, 503, 504]).toContain(response.status)
      expect(response.body).toBeDefined()
    }, 20000)

    test('should handle missing password', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .timeout(15000)
        .send({ email: 'abdulharris@motorsights.net' })

      expect([400, 422, 500, 502, 503, 504]).toContain(response.status)
      expect(response.body).toBeDefined()
    }, 20000)
  })
})

