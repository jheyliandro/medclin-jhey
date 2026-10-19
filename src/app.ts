import express from 'express';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { AppError } from './utils/AppError';

const app = express();
app.use(express.json());
app.use('/api/v1', routes);
app.use((_req, _res, next) => {
  next(new AppError('Rota não encontrada.', 404));
});
app.use(errorHandler);

export { app };
