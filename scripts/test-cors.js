// Quick test to verify CORS config
const express = require('express');
const cors = require('cors');

const app = express();

const corsOptions = {
  origin: [
    'https://dare2care-web.vercel.app',
    'https://dare2care-admin.vercel.app',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

app.post('/api/auth/login', (req, res) => {
  res.json({ test: 'CORS working' });
});

console.log('CORS Origins:', corsOptions.origin);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Test server on ${PORT}`));
