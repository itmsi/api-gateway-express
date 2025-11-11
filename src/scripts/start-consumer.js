require('dotenv').config();
const { startConsumer } = require('../modules/contact_us_user/consumer');

const start = async () => {
  try {
    console.log('Starting Contact Us Consumer...');
    await startConsumer();
  } catch (error) {
    console.error('Failed to start consumer:', error);
    process.exit(1);
  }
};

start();
