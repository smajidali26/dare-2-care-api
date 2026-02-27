import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';

/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */

const app: Application = express();

/**
 * CORS Configuration
 * Allows requests from configured web and admin origins
 */
const allowedOrigins = [
  'https://dare2care-admin.vercel.app',
  'https://dare2care-web.vercel.app',
  'https://admin.d2cajk.org',
  'https://www.d2cajk.org',
  'https://d2cajk.org',
  'http://localhost:3000',
  'http://localhost:3001',
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

/**
 * Body Parsing Middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Cookie Parser Middleware
 */
app.use(cookieParser());

/**
 * Request Logging in Development
 */
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

/**
 * Health Check Routes
 */
app.use('/api/health', healthRoutes);

/**
 * Authentication Routes
 */
app.use('/api/auth', authRoutes);

/**
 * Admin Routes
 */
import adminRoutes from './routes/admin.routes';
app.use('/api/admin', adminRoutes);

/**
 * Public Routes
 */
import publicRoutes from './routes/public.routes';
app.use('/api/public', publicRoutes);

/**
 * Cron Routes
 * Protected by CRON_SECRET header
 */
import cronRoutes from './routes/cron.routes';
app.use('/api/cron', cronRoutes);

/**
 * Error Handling Middleware
 * Must be registered after all routes
 */
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
