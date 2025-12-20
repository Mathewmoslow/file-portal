import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import filesRouter from './routes/files.js';
import exportRouter from './routes/export.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticateToken } from './middleware/auth.js';
import { FileController } from './controllers/fileController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// File controller for serve endpoint
const basePath = process.env.FILE_BASE_PATH || '../test-files';
const fileController = new FileController(basePath);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(compression());
app.use(morgan('dev'));
// No file size limit - allow unlimited uploads
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);
app.use('/api/export', exportRouter);

// Serve endpoint for file preview (requires auth)
app.get('/api/serve', authenticateToken, fileController.serveFile.bind(fileController));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 File base path: ${process.env.FILE_BASE_PATH}`);
  console.log(`🔐 CORS origin: ${process.env.CORS_ORIGIN}`);
});
