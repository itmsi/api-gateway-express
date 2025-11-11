const client = require('prom-client');

// Mengatur default metrics untuk Prometheus
const register = new client.Registry();

// Menambahkan default metrics
client.collectDefaultMetrics({ 
  register,
  prefix: 'report_management_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Custom metrics untuk aplikasi report management
const httpRequestTotal = new client.Counter({
  name: 'report_management_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'report_management_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

const httpRequestSize = new client.Histogram({
  name: 'report_management_http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

const activeConnections = new client.Gauge({
  name: 'report_management_active_connections',
  help: 'Number of active connections',
  registers: [register],
});

const databaseConnections = new client.Gauge({
  name: 'report_management_database_connections',
  help: 'Number of database connections',
  labelNames: ['status'],
  registers: [register],
});

const businessMetrics = {
  reportsGenerated: new client.Counter({
    name: 'report_management_reports_generated_total',
    help: 'Total number of reports generated',
    labelNames: ['report_type', 'status'],
    registers: [register],
  }),
  
  fileUploads: new client.Counter({
    name: 'report_management_file_uploads_total',
    help: 'Total number of file uploads',
    labelNames: ['file_type', 'status'],
    registers: [register],
  }),
  
  userLogins: new client.Counter({
    name: 'report_management_user_logins_total',
    help: 'Total number of user logins',
    labelNames: ['user_type', 'status'],
    registers: [register],
  }),
  
  ssoRequests: new client.Counter({
    name: 'report_management_sso_requests_total',
    help: 'Total number of SSO requests',
    labelNames: ['client_id', 'status'],
    registers: [register],
  }),
};

// Queue metrics untuk RabbitMQ
const queueMetrics = {
  messagesProcessed: new client.Counter({
    name: 'report_management_queue_messages_processed_total',
    help: 'Total number of messages processed from queue',
    labelNames: ['queue_name', 'status'],
    registers: [register],
  }),
  
  queueSize: new client.Gauge({
    name: 'report_management_queue_size',
    help: 'Current size of the queue',
    labelNames: ['queue_name'],
    registers: [register],
  }),
};

module.exports = {
  client,
  register,
  metrics: {
    httpRequestTotal,
    httpRequestDuration,
    httpRequestSize,
    activeConnections,
    databaseConnections,
    ...businessMetrics,
    queue: queueMetrics,
  },
};
