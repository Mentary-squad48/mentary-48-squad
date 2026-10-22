import 'dotenv/config';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import multer from 'multer';
import documentsRouter from './routes/documents.routes.js';
import questionsRouter from './routes/questions.routes.js';

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origem não permitida pelo CORS.'));
  },
}));
app.use(express.json({ limit: '32kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});
app.use('/api/v1/documents', documentsRouter);
app.use('/api/v1/questions', questionsRouter);

const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    response.status(status).json({
      error: error.code === 'LIMIT_FILE_SIZE' ? 'O arquivo excede o limite de 25 MB.' : 'Upload inválido.',
    });
    return;
  }
  const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error &&
    typeof error.statusCode === 'number'
    ? error.statusCode
    : 500;
  if (statusCode === 500) {
    console.error('Erro na API:', error);
  }
  response.status(statusCode).json({ error: statusCode === 500 ? 'Erro interno do servidor.' : String(error) });
};
app.use(errorHandler);
