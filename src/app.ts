import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
 * Allowed origins are sourced from CORS_ORIGINS (comma-separated) env var.
 * Falls back to localhost dev origins so local startup is not blocked when the var is unset.
 */
const DEV_FALLBACK_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];

const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn(
    '[CORS] CORS_ORIGINS env var not set; falling back to dev origins (localhost:3000, localhost:3001)'
  );
  allowedOrigins.push(...DEV_FALLBACK_ORIGINS);
}

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
 * Security Headers (DARE2CARE-22)
 * Applied early — after CORS, before the body parsers and every route
 * (including the Stripe webhook mount below). helmet() only sets response
 * headers; it never reads or touches the request body, so it cannot
 * interfere with the webhook's raw-body signature verification.
 *
 * `contentSecurityPolicy` is deliberately left OFF: this is a JSON API with
 * no HTML responses, and a wrong CSP is worse than none — CSP is tracked as
 * a separate, deliberate ticket. Every other helmet 8.x default is enabled:
 *   - Strict-Transport-Security: max-age=31536000; includeSubDomains
 *   - X-Content-Type-Options: nosniff
 *   - X-Frame-Options: SAMEORIGIN
 *   - Referrer-Policy: no-referrer
 *   - Cross-Origin-Opener-Policy: same-origin
 *   - Cross-Origin-Resource-Policy: same-origin
 *   - Origin-Agent-Cluster: ?1
 *   - X-DNS-Prefetch-Control: off
 *   - X-Download-Options: noopen
 *   - X-Permitted-Cross-Domain-Policies: none
 *   - X-XSS-Protection: 0
 *   - X-Powered-By header removed
 * (Cross-Origin-Embedder-Policy is NOT one of helmet's defaults and stays off.)
 */
app.use(helmet({ contentSecurityPolicy: false }));

/**
 * Stripe Webhook Routes
 * Mounted before the JSON body parser because Stripe signature verification
 * requires the raw request body (the route applies express.raw()).
 */
import stripeRoutes from './routes/stripe.routes';
app.use('/api/stripe', stripeRoutes);

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
