# Test Proxy Middleware

File ini untuk test apakah proxy middleware bekerja dengan benar.

## Cara Menjalankan

1. **Jalankan test server:**
   ```bash
   npm run test:proxy
   # atau
   node test-proxy.js
   ```

2. **Test tanpa proxy (direct call):**
   ```bash
   curl -X POST http://localhost:9599/test/direct \
     -H "Content-Type: application/json" \
     -d '{
       "email": "abdulharris@motorsights.net",
       "password": "QwerMSI2025!",
       "client_id": "string",
       "redirect_uri": "string"
     }'
   ```

3. **Test dengan proxy:**
   ```bash
   curl -X POST http://localhost:9599/test/proxy \
     -H "Content-Type: application/json" \
     -d '{
       "email": "abdulharris@motorsights.net",
       "password": "QwerMSI2025!",
       "client_id": "string",
       "redirect_uri": "string"
     }'
   ```

## Interpretasi Hasil

- **Jika test direct berhasil tapi test proxy gagal** → Masalahnya di proxy middleware
- **Jika kedua test gagal** → Masalahnya di service SSO atau koneksi
- **Jika kedua test berhasil** → Proxy middleware bekerja dengan benar

## Log yang Diharapkan

### Test Direct (tanpa proxy):
- `📤 Test direct API call (tanpa proxy)`
- `✅ Direct API call berhasil: 401` (atau status code lain)

### Test Proxy:
- `📤 Test dengan proxy middleware`
- `✅ onProxyReq called - Proxy melakukan request!`
- `✅ onProxyRes called - Proxy menerima response!`
- `✅ onProxyRes called - Status: 401` (atau status code lain)

Jika `onProxyReq` tidak muncul, berarti proxy tidak melakukan request.
