/**
 * PM2 Ecosystem Configuration untuk API Gateway
 * 
 * Konfigurasi ini akan membaca environment variables dari file .env
 * Pastikan file .env sudah dibuat dari .env.example
 * 
 * Cara penggunaan:
 * - Development: pm2 start ecosystem.config.js --env development
 * - Production: pm2 start ecosystem.config.js --env production
 * - Stop: pm2 stop api-gateway
 * - Restart: pm2 restart api-gateway
 * - Reload (zero-downtime): pm2 reload api-gateway
 * - Delete: pm2 delete api-gateway
 * - Monitor: pm2 monit
 * - Logs: pm2 logs api-gateway
 * - Status: pm2 status
 */

// Load environment variables from .env file
require('dotenv').config()

module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: './src/server.js',
      cwd: './',
      instances: 1, // Untuk production bisa diubah ke 'max' untuk menggunakan semua CPU cores
      exec_mode: 'fork', // 'fork' untuk single instance, 'cluster' untuk multiple instances
      watch: false, // Set true untuk development auto-reload
      max_memory_restart: '500M', // Restart jika memory melebihi 500MB
      env: {
        // Environment akan diambil dari .env file, dengan fallback ke nilai default
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || process.env.APP_PORT || 9588,
        GATEWAY_CONFIG: process.env.GATEWAY_CONFIG || './kong.yml',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        LOG_DIRECTORY: process.env.LOG_DIRECTORY || './logs',
        // Admin API Configuration
        ADMIN_USER: process.env.ADMIN_USER || 'admin',
        ADMIN_PASS: process.env.ADMIN_PASS || 'admin',
        // JWT Configuration
        JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        // Redis Configuration (jika menggunakan rate limit dengan Redis)
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: process.env.REDIS_PORT || 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD || 'Rubysa179596!',
        // JSON Body Limit
        JSON_LIMIT: process.env.JSON_LIMIT || '1mb',
      },
      env_production: {
        // Environment akan diambil dari .env file, dengan fallback ke nilai default
        NODE_ENV: process.env.NODE_ENV || 'production',
        PORT: process.env.PORT || process.env.APP_PORT || 9588,
        GATEWAY_CONFIG: process.env.GATEWAY_CONFIG || './kong.yml',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        LOG_DIRECTORY: process.env.LOG_DIRECTORY || './logs',
        // Admin API Configuration - HARUS DIUBAH DI PRODUCTION!
        ADMIN_USER: process.env.ADMIN_USER || 'admin',
        ADMIN_PASS: process.env.ADMIN_PASS || 'change-this-password-in-production',
        // JWT Configuration
        JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        // Redis Configuration
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: process.env.REDIS_PORT || 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD || 'Rubysa179596',
        // JSON Body Limit
        JSON_LIMIT: process.env.JSON_LIMIT || '10mb',
      },
      // Error log file
      error_file: './logs/pm2/error.log',
      // Output log file
      out_file: './logs/pm2/out.log',
      // Log file date format
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Merge logs from all instances
      merge_logs: true,
      // Auto restart on crash
      autorestart: true,
      // Restart delay in milliseconds
      restart_delay: 4000,
      // Max number of restarts in the time period
      max_restarts: 10,
      // Min uptime to consider app as stable
      min_uptime: '10s',
      // Listen for these events to restart
      listen_timeout: 10000,
      // Kill timeout
      kill_timeout: 5000,
      // Wait for graceful shutdown
      wait_ready: true,
      // Shutdown with message
      shutdown_with_message: true,
    },
  ],
}

