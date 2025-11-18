# Konfigurasi Nginx untuk API Gateway

Dokumen ini menjelaskan cara mengkonfigurasi Nginx sebagai reverse proxy untuk API Gateway.

## 📋 Prerequisites

- Nginx terinstall di server
- API Gateway berjalan di port 9588 (atau port sesuai konfigurasi)
- Domain `dev-services.motorsights.com` sudah diarahkan ke server

## 🔧 Konfigurasi Nginx

### 1. Buat File Konfigurasi

Buat file konfigurasi di `/etc/nginx/sites-available/dev-services.motorsights.com`:

```nginx
server {
    listen 80;
    server_name dev-services.motorsights.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dev-services.motorsights.com;

    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logging
    access_log /var/log/nginx/dev-services-access.log;
    error_log /var/log/nginx/dev-services-error.log;

    # Client body size limit
    client_max_body_size 10M;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;

    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Proxy to API Gateway
    location / {
        proxy_pass http://localhost:9588;
        proxy_redirect off;
        
        # Buffer settings
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Health check endpoint (optional, for monitoring)
    location /health {
        proxy_pass http://localhost:9588/health;
        access_log off;
    }
}
```

### 2. Aktifkan Konfigurasi

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/dev-services.motorsights.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
# atau
sudo service nginx reload
```

## 🔍 Verifikasi

### 1. Test dari Server

```bash
# Test health check
curl http://localhost:9588/health

# Test gateway debug
curl http://localhost:9588/debug/gateway

# Test API endpoint
curl -X POST http://localhost:9588/api/auth/sso/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'
```

### 2. Test dari External (setelah Nginx dikonfigurasi)

```bash
# Test health check via domain
curl https://dev-services.motorsights.com/health

# Test API endpoint
curl -X POST https://dev-services.motorsights.com/api/auth/sso/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'
```

## 🐛 Troubleshooting

### Nginx Error Log

```bash
# Check error log
sudo tail -f /var/log/nginx/dev-services-error.log

# Check access log
sudo tail -f /var/log/nginx/dev-services-access.log
```

### Gateway Logs

```bash
# PM2 logs
pm2 logs api-gateway

# Application logs
tail -f logs/application/*.log
```

### Common Issues

#### 1. 502 Bad Gateway

**Kemungkinan penyebab:**
- API Gateway tidak berjalan
- Port 9588 tidak listening
- Firewall memblokir koneksi

**Solusi:**
```bash
# Cek apakah gateway berjalan
pm2 status

# Cek port listening
netstat -tulpn | grep 9588
# atau
ss -tulpn | grep 9588

# Test koneksi lokal
curl http://localhost:9588/health
```

#### 2. 404 Not Found

**Kemungkinan penyebab:**
- Route tidak terdaftar di gateway
- Path tidak match dengan konfigurasi

**Solusi:**
```bash
# Cek routes yang terdaftar
curl http://localhost:9588/debug/gateway

# Cek konfigurasi kong.yml
cat kong.yml | grep -A 5 "sso-login-route"
```

#### 3. Connection Timeout

**Kemungkinan penyebab:**
- Backend service tidak berjalan
- Network issue
- Timeout terlalu pendek

**Solusi:**
```bash
# Cek backend service
curl http://localhost:9518/api/auth/sso/login

# Cek koneksi
telnet localhost 9518
```

#### 4. SSL Certificate Error

**Solusi:**
- Pastikan certificate path benar
- Pastikan permission file certificate benar
- Test dengan: `sudo nginx -t`

## 📊 Monitoring

### Nginx Status

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx configuration
sudo nginx -T | grep -A 20 "dev-services"
```

### Gateway Status

```bash
# PM2 status
pm2 status

# Gateway debug
curl http://localhost:9588/debug/gateway
```

## 🔐 Security Best Practices

1. **SSL/TLS**: Selalu gunakan HTTPS di production
2. **Rate Limiting**: Aktifkan rate limiting di Nginx atau Gateway
3. **Firewall**: Pastikan hanya port 80 dan 443 yang terbuka
4. **Headers**: Tambahkan security headers di Nginx:

```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

## 📝 Catatan Penting

1. **Port**: Pastikan port 9588 tidak diakses langsung dari luar (hanya via Nginx)
2. **Backend Services**: Pastikan backend services (port 9518, 9544, dll) hanya accessible dari localhost
3. **Logs**: Monitor logs secara berkala untuk mendeteksi masalah
4. **Restart**: Setelah mengubah konfigurasi, restart Nginx: `sudo systemctl reload nginx`

## 🔄 Reload Konfigurasi

Setelah mengubah konfigurasi Nginx:

```bash
# Test konfigurasi
sudo nginx -t

# Reload (tanpa downtime)
sudo systemctl reload nginx

# Atau restart (dengan downtime singkat)
sudo systemctl restart nginx
```

