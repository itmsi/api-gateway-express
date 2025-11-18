# Ringkasan Konfigurasi API Gateway dengan PM2

## ✅ File yang Telah Dibuat/Dimodifikasi

### 1. `ecosystem.config.js` (BARU)
File konfigurasi PM2 untuk menjalankan API Gateway dengan pengaturan:
- Development dan Production environment
- Auto-restart on crash
- Memory limit monitoring
- Log management
- Environment variables configuration

### 2. `package.json` (DIMODIFIKASI)
Menambahkan script PM2:
- `npm run pm2:start` - Start development
- `npm run pm2:start:prod` - Start production
- `npm run pm2:stop` - Stop application
- `npm run pm2:restart` - Restart application
- `npm run pm2:reload` - Reload (zero-downtime)
- `npm run pm2:delete` - Delete from PM2
- `npm run pm2:logs` - View logs
- `npm run pm2:monit` - Monitor real-time
- `npm run pm2:status` - Check status

### 3. `PM2_GUIDE.md` (BARU)
Panduan lengkap penggunaan PM2 untuk API Gateway

### 4. `logs/pm2/` (BARU)
Direktori untuk menyimpan log PM2

## 📋 Konfigurasi Saat Ini

### Environment Variables

Konfigurasi akan membaca dari file `.env`. Buat file `.env` dengan konfigurasi berikut:

**Contoh .env:**
```env
NODE_ENV=development
PORT=3000
GATEWAY_CONFIG=./kong.yml
LOG_LEVEL=info
ADMIN_USER=admin
ADMIN_PASS=admin
JWT_SECRET=your-secret-key-change-in-production
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Default Values** (jika tidak ada di .env):
- `NODE_ENV`: development (atau production untuk env_production)
- `PORT`: 3000
- `GATEWAY_CONFIG`: ./kong.yml
- `LOG_LEVEL`: info
- `ADMIN_USER`: admin
- `ADMIN_PASS`: admin (development) / change-this-password-in-production (production) ⚠️

## ⚠️ PENTING: Sebelum Production

1. **Buat File .env**:
   ```bash
   cp environment.example .env
   # atau buat manual
   touch .env
   ```

2. **Ubah Password Admin** di file `.env`:
   ```env
   ADMIN_PASS=your-secure-password-here
   ```

3. **Ubah JWT Secret** di file `.env`:
   ```env
   JWT_SECRET=your-strong-secret-key-here
   ```

4. **Review Environment Variables** di file `.env` sesuai kebutuhan production

**Catatan**: Konfigurasi PM2 (`ecosystem.config.js`) akan otomatis membaca dari file `.env`, jadi cukup edit file `.env` saja.

## 🚀 Quick Start

### 1. Buat File .env
```bash
# Copy dari environment.example (jika ada)
cp environment.example .env

# Atau buat manual dan edit sesuai kebutuhan
touch .env
```

Edit file `.env` dan tambahkan konfigurasi yang diperlukan (lihat contoh di atas).

### 2. Install PM2 (jika belum)
```bash
npm install -g pm2
```

### 3. Start Application
```bash
# Development
npm run pm2:start

# Production
npm run pm2:start:prod
```

### 4. Check Status
```bash
npm run pm2:status
```

### 5. View Logs
```bash
npm run pm2:logs
```

## 📊 Struktur Konfigurasi

```
api-gateway-express/
├── ecosystem.config.js      # Konfigurasi PM2
├── kong.yml                  # Konfigurasi Gateway (services, routes, plugins)
├── package.json              # Scripts PM2
├── PM2_GUIDE.md             # Panduan lengkap PM2
├── CONFIGURATION_SUMMARY.md  # File ini
└── logs/
    └── pm2/                  # Logs PM2
        ├── error.log
        └── out.log
```

## 🔧 Konfigurasi Gateway (kong.yml)

File `kong.yml` sudah dikonfigurasi dengan:
- Multiple services (sso-service, power-bi-service, interview-service, dll)
- Routes untuk setiap service
- CORS plugin
- Rate limiting plugin
- Timeout configurations

## 📝 Catatan

1. **Port Default**: 3000 (bisa diubah di `ecosystem.config.js`)
2. **Config File**: `kong.yml` (bisa diubah via `GATEWAY_CONFIG`)
3. **Logs**: Tersimpan di `./logs/pm2/`
4. **Admin API**: Tersedia di `/admin` (jika diaktifkan di kong.yml)
5. **Health Check**: Tersedia di `/health`

## 🔄 Reload Konfigurasi

Setelah mengubah `kong.yml`, reload tanpa restart:

```bash
# Via Admin API
curl -u admin:admin -X POST http://localhost:3000/admin/reload

# Via PM2
npm run pm2:reload
```

## 📚 Dokumentasi

- **PM2 Guide**: Lihat `PM2_GUIDE.md` untuk panduan lengkap
- **API Gateway**: Lihat `README.md` untuk dokumentasi gateway

## ✅ Checklist Sebelum Deploy Production

- [ ] Install PM2: `npm install -g pm2`
- [ ] Ubah `ADMIN_PASS` di `ecosystem.config.js`
- [ ] Ubah `JWT_SECRET` di `ecosystem.config.js`
- [ ] Review semua environment variables
- [ ] Pastikan `kong.yml` sudah benar
- [ ] Test start dengan `npm run pm2:start:prod`
- [ ] Setup PM2 secara manual di server sesuai kebutuhan
- [ ] Monitor logs: `npm run pm2:logs`
- [ ] Test health check: `curl http://localhost:3000/health`
- [ ] Test admin API: `curl -u admin:password http://localhost:3000/admin/config`

