const info = {
  description: 'Express.js API Boilerplate - Template untuk pengembangan REST API dengan fitur lengkap',
  version: '1.0.0',
  title: 'Express.js API Boilerplate Documentation',
  contact: {
    email: 'your-email@example.com'
  },
  license: {
    name: 'MIT',
    url: 'https://opensource.org/licenses/MIT'
  }
}

const servers = [
  {
    url: '/api/',
    description: 'Development server'
  },
  {
    url: 'https://your-production-url.com/api/',
    description: 'Production server'
  }
]

// Import schemas
// Tambahkan schema module Anda di sini
const exampleSchema = require('./schema/example');

// Import paths
// Tambahkan path module Anda di sini
const examplePaths = require('./path/example');

// Combine all schemas
const schemas = {
  ...exampleSchema,
  // ...yourModuleSchema,
};

// Combine all paths
const paths = {
  ...examplePaths,
  // ...yourModulePaths,
};

const index = {
  openapi: '3.0.0',
  info,
  servers,
  paths,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas
  }
}

module.exports = {
  index
}
