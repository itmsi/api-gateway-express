# 🔧 Troubleshooting Proxy Errors

## Error: "Error occurred while trying to proxy: localhost:9588/api/auth/sso/login"

### Penyebab Umum

1. **Service SSO tidak berjalan**
   - Service di port 9518 tidak aktif
   - Service crash atau error

2. **Timeout**
   - Service SSO terlalu lambat merespons
   - Timeout default terlalu pendek

3. **Network Issues**
   - Firewall memblokir koneksi
   - Service tidak bisa diakses dari gateway

4. **Konfigurasi Salah**
   - URL service salah di `kong.yml`
   - Path routing tidak sesuai

## ✅ Solusi

### 1. Cek Service SSO Berjalan

```bash
# Test langsung ke service SSO
curl -X POST http://localhost:9518/api/auth/sso/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Cek port listening
lsof -i :9518
# atau
netstat -an | grep 9518
```

**Expected**: Service harus merespons (bisa 400, 401, atau 200, bukan connection refused)

### 2. Cek Konfigurasi Gateway

Pastikan di `kong.yml`:

```yaml
services:
  - name: sso-service
    url: http://localhost:9518  # ✅ Pastikan URL benar
    connect_timeout: 60000      # ✅ Timeout 60 detik
    write_timeout: 60000
    read_timeout: 60000
    routes:
      - name: sso-login-route
        paths:
          - /api/auth/sso/login
        methods:
          - POST
          - OPTIONS
        strip_path: false  # ✅ Jangan strip path
```

### 3. Restart Gateway

Setelah mengubah konfigurasi:

```bash
# Jika menggunakan PM2
pm2 restart api-gateway

# Atau jika manual
# Stop dan start ulang server
```

### 4. Cek Log Gateway

```bash
# Lihat log terbaru
tail -f logs/gateway-*.log

# Cari error proxy
grep -i "proxy error" logs/gateway-*.log
```

### 5. Test dengan Curl

```bash
# Test melalui gateway
curl --location 'http://localhost:9588/api/auth/sso/login' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "abdulharris@motorsights.net",
  "password": "QwerMSI2025!"
}'
```

## 📊 Error Codes

| Error Code | Status | Penyebab | Solusi |
|------------|--------|----------|--------|
| `ECONNREFUSED` | 503 | Service tidak berjalan | Start service SSO |
| `ETIMEDOUT` | 504 | Service timeout | Increase timeout atau optimize service |
| `ENOTFOUND` | 502 | Host tidak ditemukan | Cek URL di kong.yml |
| `502 Bad Gateway` | 502 | Generic proxy error | Cek log untuk detail |

## 🔍 Debugging Steps

1. **Cek Service Status**
   ```bash
   curl http://localhost:9518/health
   ```

2. **Cek Gateway Status**
   ```bash
   curl http://localhost:9588/health
   curl http://localhost:9588/debug/gateway
   ```

3. **Test Direct Connection**
   ```bash
   # Dari server gateway, test ke service SSO
   curl http://localhost:9518/api/auth/sso/login
   ```

4. **Cek Network**
   ```bash
   # Test connectivity
   telnet localhost 9518
   # atau
   nc -zv localhost 9518
   ```

## 🛠️ Perbaikan yang Sudah Dilakukan

1. ✅ **Error Handling Improved**
   - Pesan error lebih informatif
   - Status code lebih spesifik (503, 504, 502)

2. ✅ **Timeout Configuration**
   - Timeout diambil dari `kong.yml` (connect_timeout, read_timeout, write_timeout)
   - Default timeout 60 detik (sesuai kong.yml)

3. ✅ **Better Logging**
   - Log lebih detail untuk debugging
   - Error code dan message dicatat

## 📝 Contoh Response Error

### Service Tidak Berjalan (503)
```json
{
  "error": "Service sso-service is not available. Connection refused to http://localhost:9518",
  "service": "sso-service",
  "target": "http://localhost:9518",
  "code": "ECONNREFUSED"
}
```

### Timeout (504)
```json
{
  "error": "Service sso-service timeout. The service at http://localhost:9518 did not respond in time.",
  "service": "sso-service",
  "target": "http://localhost:9518",
  "code": "ETIMEDOUT"
}
```

### Host Not Found (502)
```json
{
  "error": "Service sso-service host not found: http://localhost:9518",
  "service": "sso-service",
  "target": "http://localhost:9518",
  "code": "ENOTFOUND"
}
```

## 🚀 Quick Fix

Jika masih error setelah semua langkah di atas:

1. **Restart Service SSO**
2. **Restart Gateway**
3. **Cek firewall/network rules**
4. **Cek log kedua service untuk error detail**

---

**Catatan**: Pastikan service SSO berjalan dan bisa diakses sebelum menggunakan gateway.

