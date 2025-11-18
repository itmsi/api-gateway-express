# Troubleshooting API Gateway

Dokumen ini berisi panduan untuk mengatasi masalah umum pada API Gateway.

## 🔍 API Tidak Bisa Diakses

### 1. Cek Apakah Server Berjalan

```bash
# Cek status PM2
pm2 status

# Cek logs
pm2 logs api-gateway

# Cek apakah port listening
netstat -tulpn | grep 9588
# atau
lsof -i :9588
```

### 2. Test Health Check

```bash
curl http://localhost:9588/health
```

Jika health check berhasil, server berjalan dengan baik.

### 3. Test Debug Endpoint

```bash
curl http://localhost:9588/debug/gateway
```

Endpoint ini akan menampilkan:
- Status gateway
- Jumlah services yang terdaftar
- Daftar services dan routes

### 4. Cek Logs untuk Error

```bash
# PM2 logs
pm2 logs api-gateway --err

# Application logs
tail -f logs/application/*.log

# PM2 logs
tail -f logs/pm2/error.log
```

### 5. Cek Konfigurasi Gateway

Pastikan file `kong.yml` valid:

```bash
# Test load config (jika ada script)
node -e "const {loadConfig} = require('./src/gateway/config-loader'); console.log(loadConfig('kong.yml'))"
```

### 6. Cek Backend Services

Pastikan backend services yang di-proxy bisa diakses:

```bash
# Test backend service langsung
curl http://localhost:9518/api/auth/sso/login

# Cek apakah service running
netstat -tulpn | grep 9518
```

### 7. Cek Environment Variables

Pastikan file `.env` ada dan berisi konfigurasi yang benar:

```bash
# Cek file .env
cat .env | grep -E "PORT|APP_PORT|GATEWAY_CONFIG"

# Test load env
node -e "require('dotenv').config(); console.log('PORT:', process.env.PORT, 'APP_PORT:', process.env.APP_PORT)"
```

## 🐛 Masalah Umum

### Port Already in Use

**Error**: `EADDRINUSE` atau `Port X is already in use`

**Solusi**:
```bash
# Cari process yang menggunakan port
lsof -i :9588

# Kill process
kill -9 <PID>

# Atau ubah port di .env
PORT=9589
```

### Gateway Config Tidak Ter-load

**Error**: `Config file not found` atau `Failed to load gateway configuration`

**Solusi**:
1. Pastikan file `kong.yml` ada di root directory
2. Cek path di `GATEWAY_CONFIG` di `.env`
3. Cek permission file: `ls -la kong.yml`

### Backend Service Tidak Bisa Diakses

**Error**: `502 Bad Gateway` atau `Proxy error`

**Solusi**:
1. Pastikan backend service running
2. Cek URL di `kong.yml` benar
3. Test koneksi ke backend: `curl http://backend-url/health`
4. Cek firewall/network

### Routes Tidak Terdaftar

**Gejala**: Request ke endpoint tertentu tidak di-proxy

**Solusi**:
1. Cek `/debug/gateway` untuk melihat routes yang terdaftar
2. Pastikan path di `kong.yml` benar
3. Cek urutan routes (yang lebih spesifik harus di atas)
4. Reload config: `curl -u admin:admin -X POST http://localhost:9588/admin/reload`

### CORS Error

**Error**: `CORS policy` atau `Access-Control-Allow-Origin`

**Solusi**:
1. Cek konfigurasi CORS di `kong.yml` (plugins section)
2. Pastikan origin yang diizinkan sesuai
3. Untuk development, bisa set `origins: ["*"]`

## 📊 Monitoring & Debugging

### Endpoint Debugging

- **Health Check**: `GET /health`
- **Gateway Status**: `GET /debug/gateway`
- **Admin Config**: `GET /admin/config` (dengan auth)

### Logs Location

- **PM2 Logs**: `logs/pm2/error.log` dan `logs/pm2/out.log`
- **Application Logs**: `logs/application/`
- **Gateway Logs**: Sesuai `LOG_DIRECTORY` di `.env`

### Useful Commands

```bash
# Monitor real-time
pm2 monit

# Restart gateway
pm2 restart api-gateway

# Reload config tanpa restart
curl -u admin:admin -X POST http://localhost:9588/admin/reload

# Test endpoint
curl -X POST http://localhost:9588/api/auth/sso/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Check process
ps aux | grep node
```

## 🔧 Advanced Troubleshooting

### Enable Debug Logging

Edit `.env`:
```env
LOG_LEVEL=debug
```

### Test Proxy Manually

```bash
# Test dengan curl
curl -v http://localhost:9588/api/auth/sso/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Check Network Connectivity

```bash
# Test koneksi ke backend
telnet localhost 9518

# Atau dengan nc
nc -zv localhost 9518
```

### Verify YAML Syntax

```bash
# Install yamllint atau gunakan online validator
python -m yaml kong.yml
```

## 📞 Masih Bermasalah?

Jika masalah masih terjadi:

1. **Cek semua logs**: `pm2 logs api-gateway --lines 100`
2. **Cek konfigurasi**: Pastikan semua environment variables benar
3. **Test step by step**: 
   - Health check dulu
   - Debug endpoint
   - Test backend langsung
   - Test melalui gateway
4. **Restart clean**: 
   ```bash
   pm2 delete api-gateway
   pm2 start ecosystem.config.js --env production
   ```

