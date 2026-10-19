import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from './database/data-source';
import { app } from './app';

const PORT = Number(process.env.PORT ?? 3000);

AppDataSource.initialize()
  .then(() => {
    console.log('📦 Banco de dados conectado com sucesso.');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 MedClinic API rodando em http://localhost:${PORT}`);
      console.log('   Prefixo base: /api/v1');
    });
  })
  .catch((err: unknown) => {
    console.error('❌ Erro ao conectar com o banco de dados:', err);
    process.exit(1);
  });

export { app };
