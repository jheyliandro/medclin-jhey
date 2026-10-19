import express from 'express';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();
app.use(express.json());
app.use('/api/v1', routes);
app.use(errorHandler);

export { app };
