# 🔒 Security Guide - Akses Langsung vs Melalui Gateway

## ⚠️ Peringatan Keamanan

**TIDAK DISARANKAN** mengakses service SSO secara langsung (port 9518) dari aplikasi client atau frontend.

## 🚨 Risiko Keamanan Akses Langsung ke Service SSO

### 1. **Bypass Security Layer Gateway**
Gateway menyediakan beberapa lapisan keamanan yang akan terlewati jika akses langsung:
- ❌ **Rate Limiting**: Tidak ada proteksi terhadap brute force attack
- ❌ **Request Logging**: Tidak ada audit trail terpusat
- ❌ **JWT Authentication**: Plugin JWT di gateway tidak berjalan
- ❌ **IP Filtering**: Tidak ada filtering berdasarkan IP
- ❌ **Request Validation**: Middleware validation di gateway tidak berjalan

### 2. **Exposure Service Internal**
- Service SSO seharusnya hanya diakses dari internal network atau melalui gateway
- Exposing port 9518 langsung ke internet membuat service rentan terhadap:
  - DDoS attacks
  - Direct API abuse
  - Unauthorized access attempts

### 3. **Tidak Ada Centralized Monitoring**
- Gateway menyediakan logging terpusat untuk semua request
- Akses langsung membuat monitoring menjadi sulit
- Tidak ada visibility untuk security team

### 4. **Tidak Ada Request Transformation**
- Gateway bisa menambahkan/mengubah headers (x-forwarded-*, dll)
- Gateway bisa melakukan request validation sebelum diteruskan
- Gateway bisa melakukan response transformation

## ✅ Best Practice: Gunakan Gateway

### Akses yang Benar

```bash
# ✅ BENAR: Melalui Gateway (port 9588)
curl --location 'http://localhost:9588/api/auth/sso/login' \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "abdulharris@motorsights.net",
  "password": "QwerMSI2025!",
  "client_id": "string",
  "redirect_uri": "string"
}'
```

### Akses yang Tidak Disarankan

```bash
# ❌ TIDAK DISARANKAN: Langsung ke Service (port 9518)
curl --location 'http://localhost:9518/api/auth/sso/login' \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "abdulharris@motorsights.net",
  "password": "QwerMSI2025!",
  "client_id": "string",
  "redirect_uri": "string"
}'
```

## 🛡️ Fitur Keamanan Gateway

Gateway menyediakan fitur keamanan berikut:

### 1. Rate Limiting
```yaml
# kong.yml
services:
  - name: sso-service
    plugins:
      - name: rate-limit
        config:
          policy: memory  # atau redis untuk distributed
          points: 10       # 10 requests
          duration: 60     # per 60 detik
```

### 2. JWT Authentication (jika diperlukan)
```yaml
services:
  - name: sso-service
    routes:
      - paths:
          - /api/auth/sso/userinfo
        plugins:
          - name: jwt-auth
            config:
              secret: ${JWT_SECRET}
```

### 3. Request Logging
- Semua request dicatat dengan detail (IP, method, path, timestamp)
- Log tersimpan di `logs/gateway/`
- Dapat diintegrasikan dengan monitoring tools

### 4. Error Handling
- Gateway menangani error dengan baik
- Tidak expose internal error details ke client
- Standardized error response

## 📋 Rekomendasi Implementasi

### Untuk Development
- Gunakan gateway untuk semua akses ke service SSO
- Jangan expose port 9518 ke public network
- Gunakan environment variables untuk konfigurasi

### Untuk Production
1. **Firewall Rules**
   ```bash
   # Hanya allow akses dari gateway server
   # Block direct access ke port 9518 dari internet
   ```

2. **Network Isolation**
   - Service SSO seharusnya di private network
   - Gateway di DMZ atau public network
   - Gunakan VPN untuk akses internal

3. **Monitoring & Alerting**
   - Monitor semua request melalui gateway
   - Set up alert untuk suspicious activity
   - Log analysis untuk security incidents

4. **Rate Limiting Configuration**
   ```yaml
   # kong.yml - Production config
   services:
     - name: sso-service
       plugins:
         - name: rate-limit
           config:
             policy: redis
             points: 5        # Lebih ketat di production
             duration: 60
             blockDuration: 300  # Block 5 menit jika limit exceeded
   ```

## 🔍 Testing

Gunakan test yang sudah dibuat untuk memastikan gateway berfungsi:

```bash
# Test melalui gateway
npm test -- test/integration/api/auth-sso-login.test.js
```

Test ini memverifikasi bahwa:
- ✅ Route terdaftar dengan benar
- ✅ Request di-proxy ke service SSO
- ✅ Response handling bekerja
- ✅ Error handling proper

## 📝 Checklist Keamanan

- [ ] Service SSO tidak exposed langsung ke internet
- [ ] Firewall rules membatasi akses ke port 9518
- [ ] Gateway memiliki rate limiting yang dikonfigurasi
- [ ] Logging enabled untuk audit trail
- [ ] Monitoring tools terintegrasi
- [ ] Error handling tidak expose internal details
- [ ] SSL/TLS enabled untuk production
- [ ] Regular security audit dilakukan

## 🚀 Kesimpulan

**SELALU gunakan Gateway (port 9588) untuk akses ke service SSO**, bukan langsung ke service (port 9518). Ini memastikan:

1. ✅ Security layers aktif
2. ✅ Rate limiting berfungsi
3. ✅ Logging dan monitoring proper
4. ✅ Error handling standardized
5. ✅ Future-proof untuk penambahan security features

---

**Catatan**: Akses langsung ke port 9518 hanya untuk:
- Development/testing internal
- Service-to-service communication di trusted network
- Admin/debugging purposes (dengan akses terbatas)

