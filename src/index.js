const Application = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const redisClient = require('./config/redis');
const db = require('./config/database');

async function startServer() {
  try {
    // Test database connection
    await db.raw('SELECT 1');
    logger.info('Database connected successfully');

    // Connect to Redis
    await redisClient.connect();
    logger.info('Redis connected successfully');

    // Initialize application
    const application = new Application();
    
    // Initialize rate limiter with Redis client
    await application.initializeRateLimiter(redisClient.client);
    logger.info('Rate limiter initialized successfully');
    
    const app = application.getApp();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`AmplifiER - Light started on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`API Version: ${config.api.version}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await db.destroy();
        await redisClient.disconnect();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await db.destroy();
        await redisClient.disconnect();
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();