# Dare2Care API

Backend API for the Dare2Care non-profit organization platform.

## Project Structure

```
dare2care-api/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/                # Configuration files
│   │   └── database.config.ts # Prisma client singleton
│   ├── controllers/           # Request handlers
│   ├── middleware/            # Express middleware
│   │   └── errorHandler.middleware.ts
│   ├── repositories/          # Database access layer
│   ├── routes/                # API routes
│   │   └── health.routes.ts  # Health check endpoints
│   ├── services/              # Business logic
│   ├── types/                 # TypeScript type definitions
│   ├── utils/                 # Utility functions
│   ├── validators/            # Request validation schemas
│   ├── app.ts                 # Express app configuration
│   └── server.ts              # Server entry point
├── .env                       # Environment variables (not in git)
├── .env.example               # Environment template
├── .gitignore
├── nodemon.json               # Nodemon configuration
├── package.json
├── prisma.config.ts
└── tsconfig.json              # TypeScript configuration
```

## Prerequisites

- Node.js >= 18
- PostgreSQL database
- npm or yarn

## Setup

1. Clone the repository and navigate to the project:
   ```bash
   cd dare2care-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your actual configuration:
   - Database connection string
   - JWT secrets
   - Supabase credentials
   - Email/SMS service credentials

5. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

6. Run database migrations (when ready):
   ```bash
   npm run prisma:migrate
   ```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:push` - Push schema changes to database
- `npm run prisma:studio` - Open Prisma Studio GUI

## Development

### Running the Server

```bash
npm run dev
```

The server will start on `http://localhost:4000` (or the PORT specified in .env)

### Health Check

Test if the server is running:
```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "data": {
    "status": "healthy",
    "environment": "development",
    "timestamp": "2026-01-24T...",
    "database": "connected"
  }
}
```

### Database Health Check

Test database connectivity:
```bash
curl http://localhost:4000/api/health/db
```

## Environment Variables

See `.env.example` for all required environment variables.

### Required Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token signing
- `JWT_REFRESH_SECRET` - Secret for refresh token signing
- `PORT` - Server port (default: 4000)
- `NODE_ENV` - Environment (development/production)

### Optional Variables

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `RESEND_API_KEY` - Resend email API key
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number
- `CORS_ORIGIN_WEB` - Web app origin for CORS
- `CORS_ORIGIN_ADMIN` - Admin app origin for CORS

## API Endpoints

### Health Check
- `GET /api/health` - Basic health check
- `GET /api/health/db` - Database connectivity check

### Authentication (Coming Soon)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token

## Architecture

This API follows a layered architecture pattern:

1. **Routes** - Define API endpoints and route requests
2. **Controllers** - Handle HTTP requests/responses
3. **Services** - Contain business logic
4. **Repositories** - Handle database operations
5. **Middleware** - Process requests (auth, validation, error handling)

## Error Handling

The API uses a centralized error handling middleware that catches all errors and returns consistent error responses:

```typescript
{
  "success": false,
  "error": {
    "message": "Error message",
    "stack": "..." // Only in development
  }
}
```

## Database

The project uses Prisma ORM with PostgreSQL. The database schema is defined in `prisma/schema.prisma`.

### Key Models

- User - Admin portal users
- Event - Community events
- ImageLibrary - Image management
- Notification - System notifications
- NotificationLog - Notification delivery tracking

## Security Features

- CORS protection
- JWT authentication (to be implemented)
- Rate limiting (to be implemented)
- Input validation with Zod
- SQL injection protection via Prisma
- Password hashing with bcrypt

## Contributing

1. Create a new branch for your feature
2. Write clean, documented code
3. Test your changes
4. Submit a pull request

## License

ISC
