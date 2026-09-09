import 'reflect-metadata';
import 'dotenv/config';
import express from 'express';
import { AppDataSource } from './database/data-source';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();
app.use(express.json());

app.use('/api', routes);

app.use(errorHandler);

const PORT = process.env.PORT ?? 3000;

AppDataSource.initialize()
  .then(() => {
    console.log('📦 Banco de dados conectado com sucesso.');
    app.listen(PORT, () => {
      console.log(`🚀 MedClinic API rodando em http://localhost:${PORT}`);
      console.log('   Prefixo base: /api');
    });
  })
  .catch((err: unknown) => {
    console.error('❌ Erro ao conectar com o banco de dados:', err);
    process.exit(1);
  });

export { app };
