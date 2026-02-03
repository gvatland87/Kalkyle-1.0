import express from 'express';
import cors from 'cors';
import './database.js'; // Initialiser database

import authRoutes from './routes/auth.js';
import categoriesRoutes from './routes/categories.js';
import costItemsRoutes from './routes/costItems.js';
import calculationsRoutes from './routes/calculations.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - tillat frontend domene
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// Ruter
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/cost-items', costItemsRoutes);
app.use('/api/calculations', calculationsRoutes);

// Helse-sjekk
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Kalkyle 1.0 API',
    version: '2.0.0',
    status: 'running'
  });
});

// Feilhåndtering
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Noe gikk galt!' });
});

app.listen(PORT, () => {
  console.log(`Server kjører på port ${PORT}`);
});
