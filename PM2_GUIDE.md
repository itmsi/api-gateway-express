# Panduan Menjalankan API Gateway dengan PM2

Dokumen ini menjelaskan cara menjalankan API Gateway menggunakan PM2 tanpa Docker.

> **Catatan**: Setup PM2 di server dilakukan secara manual. File konfigurasi `ecosystem.config.js` disediakan untuk memudahkan setup manual di server sesuai kebutuhan.

## 📋 Prerequisites

Pastikan sudah terinstall:
- **Node.js** (v14 atau lebih baru)
- **PM2** secara global: `npm install -g pm2`
- **PostgreSQL** (jika diperlukan untuk fitur tertentu)
- **Redis** (opsional, untuk rate limiting dengan Redis)

## 🚀 Instalasi PM2

Jika belum terinstall PM2, jalankan:

```bash
npm install -g pm2
```

## 📝 Konfigurasi

### 1. Buat File .env

Konfigurasi PM2 akan membaca environment variables dari file `.env`. Buat file `.env` di root directory:

```bash
# Copy dari environment.example (jika ada)
cp environment.example .env

# Atau buat manual
touch .env
```

Tambahkan konfigurasi berikut ke file `.env`:

```env
# Application Configuration
NODE_ENV=development
PORT=3000
APP_PORT=3000

# Gateway Configuration
GATEWAY_CONFIG=./kong.yml
LOG_LEVEL=info
LOG_DIRECTORY=./logs
JSON_LIMIT=1mb

# Admin API Configuration
ADMIN_USER=admin
ADMIN_PASS=admin
# Untuk production, gunakan password yang kuat!

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 2. File Konfigurasi PM2

File `ecosystem.config.js` sudah dikonfigurasi untuk membaca dari file `.env`. Konfigurasi akan:
- Membaca environment variables dari `.env` file
- Menggunakan nilai default jika variable tidak ditemukan di `.env`

Anda bisa menyesuaikan:
- **instances**: Jumlah instance (default: 1, bisa diubah ke 'max' untuk production)
- **exec_mode**: Mode eksekusi ('fork' atau 'cluster')
- **max_memory_restart**: Batas memory sebelum restart otomatis

**PENTING**: 
- Pastikan file `.env` sudah dibuat sebelum menjalankan PM2
- Untuk production, pastikan untuk mengubah `ADMIN_PASS` dan `JWT_SECRET` di file `.env`!
- Jangan commit file `.env` ke repository (sudah ada di .gitignore)

## 🎯 Cara Menjalankan

### Development Mode

```bash
npm run pm2:start
# atau
pm2 start ecosystem.config.js --env development
```

### Production Mode

```bash
npm run pm2:start:prod
# atau
pm2 start ecosystem.config.js --env production
```

## 📊 Monitoring & Management

### Melihat Status

```bash
npm run pm2:status
# atau
pm2 status
```

### Melihat Logs

```bash
# Logs real-time
npm run pm2:logs
# atau
pm2 logs api-gateway

# Logs dengan filter
pm2 logs api-gateway --lines 100
pm2 logs api-gateway --err
pm2 logs api-gateway --out
```

### Monitoring Real-time

```bash
npm run pm2:monit
# atau
pm2 monit
```

### Restart Application

```bash
# Hard restart (downtime)
npm run pm2:restart
# atau
pm2 restart api-gateway

# Graceful reload (zero-downtime)
npm run pm2:reload
# atau
pm2 reload api-gateway
```

### Stop Application

```bash
npm run pm2:stop
# atau
pm2 stop api-gateway
```

### Hapus dari PM2

```bash
npm run pm2:delete
# atau
pm2 delete api-gateway
```

## 🔄 Reload Konfigurasi Gateway

Setelah mengubah file `kong.yml`, Anda bisa reload konfigurasi tanpa restart aplikasi:

### Via Admin API

```bash
curl -u admin:admin -X POST http://localhost:3000/admin/reload
```

### Via PM2 Reload

```bash
pm2 reload api-gateway
```

## 📁 Struktur Logs

Logs akan tersimpan di:
- **PM2 Logs**: `./logs/pm2/error.log` dan `./logs/pm2/out.log`
- **Application Logs**: `./logs/application/` (jika dikonfigurasi)
- **Gateway Logs**: Sesuai konfigurasi `LOG_DIRECTORY` di environment

## 🔧 Konfigurasi Lanjutan

### Menjalankan Multiple Instances

Edit `ecosystem.config.js`:

```javascript
{
  instances: 'max', // atau angka tertentu seperti 4
  exec_mode: 'cluster',
  // ...
}
```

### Environment Variables dari File .env

File `ecosystem.config.js` sudah dikonfigurasi untuk membaca environment variables dari file `.env`. Pastikan file `.env` sudah dibuat dan dikonfigurasi dengan benar sebelum menjalankan PM2.

**Catatan**: Setup PM2 di server dilakukan secara manual. Tidak perlu menjalankan `pm2 startup` atau `pm2 save` karena akan di-setup manual di server.

## 🛡️ Production Best Practices

1. **Ubah Password Admin**: Pastikan `ADMIN_PASS` diubah di production (di file `.env`)
2. **Ubah JWT Secret**: Pastikan `JWT_SECRET` diubah di production (di file `.env`)
3. **Setup Log Rotation**: PM2 sudah include log rotation, pastikan disk space mencukupi
4. **Monitor Memory**: Set `max_memory_restart` sesuai kebutuhan di `ecosystem.config.js`
5. **Setup Manual di Server**: Setup PM2 dilakukan secara manual di server sesuai kebutuhan
6. **Backup Logs**: Setup backup untuk logs penting
7. **Health Check**: Monitor endpoint `/health` untuk monitoring

## 🐛 Troubleshooting

### Application tidak start

```bash
# Cek logs error
pm2 logs api-gateway --err

# Cek status detail
pm2 describe api-gateway
```

### Memory Issues

```bash
# Monitor memory usage
pm2 monit

# Restart jika memory tinggi
pm2 restart api-gateway
```

### Port Already in Use

Pastikan port 3000 (atau port yang dikonfigurasi) tidak digunakan aplikasi lain:

```bash
# Cek port yang digunakan
lsof -i :3000

# Kill process jika perlu
kill -9 <PID>
```

### Konfigurasi tidak ter-load

Pastikan file `kong.yml` ada di root directory atau sesuaikan path di `GATEWAY_CONFIG`.

## 📚 Referensi

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)

## 🔗 Quick Commands Reference

```bash
# Start
pm2 start ecosystem.config.js --env production

# Stop
pm2 stop api-gateway

# Restart
pm2 restart api-gateway

# Reload (zero-downtime)
pm2 reload api-gateway

# Delete
pm2 delete api-gateway

# Logs
pm2 logs api-gateway

# Monitor
pm2 monit

# Status
pm2 status
```

**Catatan**: Setup PM2 di server dilakukan secara manual. Tidak perlu menjalankan `pm2 startup` atau `pm2 save`.

