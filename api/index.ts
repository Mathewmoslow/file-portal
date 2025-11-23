import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from '../server/src/routes/auth';
import filesRouter from '../server/src/routes/files';
import { authenticateToken } from '../server/src/middleware/auth';

dotenv.config();

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/files', authenticateToken, filesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Export handler for Vercel
export default async (req: VercelRequest, res: VercelResponse) => {
  return new Promise((resolve, reject) => {
    app(req as any, res as any, (err: any) => {
      if (err) {
        return reject(err);
      }
      resolve(undefined);
    });
  });
};
