# Test SSO Login Endpoint

File test untuk menguji endpoint SSO Login melalui API Gateway.

## File Test

1. **test-sso-login-complete.sh** - Test lengkap sesuai dengan curl command yang diberikan
2. **test-sso-login.sh** - Test sederhana untuk quick check

## Cara Menggunakan

### Test Lengkap (Recommended)

```bash
./test-sso-login-complete.sh
```

Script ini akan:
1. Test langsung ke API destinasi (`http://localhost:9518/api/auth/sso/login`)
2. Test melalui API Gateway (`http://localhost:9588/api/auth/sso/login`)
3. Menampilkan summary hasil test

### Test Sederhana

```bash
./test-sso-login.sh
```

## Manual Test dengan Curl

### Test melalui Gateway

```bash
curl --location 'http://localhost:9588/api/auth/sso/login' \
--header 'Accept: application/json, text/plain, */*' \
--header 'Accept-Language: en-US,en;q=0.9' \
--header 'Connection: keep-alive' \
--header 'Content-Type: application/json' \
--header 'Origin: http://localhost:9549' \
--header 'Referer: http://localhost:9549/' \
--header 'Sec-Fetch-Dest: empty' \
--header 'Sec-Fetch-Mode: cors' \
--header 'Sec-Fetch-Site: cross-site' \
--header 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36' \
--header 'sec-ch-ua: "Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"' \
--header 'sec-ch-ua-mobile: ?0' \
--header 'sec-ch-ua-platform: "macOS"' \
--data-raw '{
    "email": "abdulharris@motorsights.net",
    "password": "QwerMSI2025!"
}'
```

### Test langsung ke API Destinasi

```bash
curl --location 'http://localhost:9518/api/auth/sso/login' \
--header 'accept: application/json' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "abdulharris@motorsights.net",
  "password": "QwerMSI2025!",
  "client_id": "string",
  "redirect_uri": "string"
}'
```

## Expected Behavior

1. Request masuk ke Gateway di `http://localhost:9588/api/auth/sso/login`
2. Gateway forward request ke API destinasi di `http://localhost:9518/api/auth/sso/login`
3. API destinasi memproses request (dengan atau tanpa `client_id` dan `redirect_uri`)
4. Response dikembalikan melalui Gateway ke client

## Status Code

- **200/201**: Success - Login berhasil
- **400**: Bad Request - Request format salah
- **401**: Unauthorized - Credentials salah
- **404**: Not Found - Route tidak terdaftar
- **502**: Bad Gateway - Gateway tidak bisa connect ke service
- **503**: Service Unavailable - Service tidak berjalan
- **504**: Gateway Timeout - Service tidak merespons dalam waktu yang ditentukan

## Troubleshooting

### Gateway tidak merespons (404)

- Pastikan route terdaftar di `kong.yml`
- Restart gateway setelah mengubah konfigurasi
- Cek log gateway: `tail -f logs/gateway-*.log`

### Gateway timeout (504)

- Pastikan service SSO berjalan di port 9518
- Cek koneksi network
- Cek timeout setting di `kong.yml`

### Service tidak tersedia (503)

- Pastikan service SSO berjalan
- Test langsung ke API destinasi untuk memastikan service aktif
- Cek firewall atau network configuration

## Log yang Perlu Dicek

Setelah menjalankan test, cek log untuk melihat:

1. `🔵 Route handler dipanggil` - Route handler bekerja
2. `✅ PROXY REQUEST: Mengirim ke API destinasi` - Proxy berhasil hit ke API destinasi
3. `✅ PROXY RESPONSE: Diterima dari API destinasi` - Response diterima dari API destinasi

Jika tidak ada log tersebut, ada masalah dengan routing atau service tidak berjalan.

