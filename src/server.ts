import dotenv from 'dotenv';
import app from './app';
import { disconnectDatabase } from './config/database.config';

/**
 * Load environment variables from .env file
 */
dotenv.config();

/**
 * Server Configuration
 */
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Start Express Server
 */
const server = app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`Server running in ${NODE_ENV} mode`);
  console.log(`Server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log('='.repeat(50));
});

/**
 * Graceful Shutdown Handler
 * Handles cleanup on SIGTERM and SIGINT signals
 */
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new requests
  server.close(async (err) => {
    if (err) {
      console.error('Error closing server:', err);
      process.exit(1);
    }

    console.log('HTTP server closed');

    try {
      // Disconnect from database
      await disconnectDatabase();
      console.log('All connections closed successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after timeout
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000); // 10 seconds timeout
};

/**
 * Process Signal Handlers
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Unhandled Rejection Handler
 */
process.on('unhandledRejection', (reason: Error) => {
  console.error('Unhandled Promise Rejection:', reason);
  throw reason;
});

/**
 * Uncaught Exception Handler
 */
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

export default server;
