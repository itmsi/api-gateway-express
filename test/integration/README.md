# Integration Tests

## Prerequisites

Sebelum menjalankan integration tests, pastikan:

1. **SSO Service berjalan di port 9518**
   ```bash
   # Pastikan service SSO sudah berjalan
   curl http://localhost:9518/api/auth/sso/login
   ```

2. **API Gateway bisa diakses**
   - Gateway akan berjalan di port yang dikonfigurasi di environment
   - Default: port 3000 atau sesuai `APP_PORT` di `.env`

## Menjalankan Tests

```bash
# Jalankan semua integration tests
npm test

# Jalankan test spesifik
npm test -- test/integration/api/auth-sso-login.test.js

# Jalankan dengan watch mode
npm run test:watch

# Jalankan dengan coverage
npm run test:coverage
```

## Test Files

### `api/auth-sso-login.test.js`

Test untuk endpoint `/api/auth/sso/login` yang mem-proxy request ke SSO service.

**Test Cases:**
- ✅ Proxy login request dengan credentials yang valid
- ✅ Handle missing email
- ✅ Handle missing password  
- ✅ Handle invalid credentials
- ✅ Handle empty request body
- ✅ CORS headers handling

**Catatan:**
- Test akan timeout jika service SSO tidak berjalan di `http://localhost:9518`
- Test akan menerima status code 502 (Bad Gateway) jika service tidak tersedia
- Test akan menerima status code 200/201 jika login berhasil
- Test akan menerima status code 401 jika credentials tidak valid

## Troubleshooting

### Test Timeout

Jika test timeout, pastikan:
1. Service SSO berjalan di port 9518
2. Tidak ada firewall yang memblokir koneksi
3. Service SSO merespons dengan cepat (< 10 detik)

### Test Mengembalikan 502 Bad Gateway

Ini berarti service SSO tidak tersedia. Pastikan service berjalan:
```bash
# Cek apakah service berjalan
curl http://localhost:9518/health

# Atau cek port
lsof -i :9518
```

### Test Mengembalikan 408 Request Timeout

Ini berarti service SSO terlalu lambat merespons. Cek:
1. Log service SSO untuk melihat apakah ada error
2. Database connection untuk service SSO
3. Resource usage (CPU, memory)

