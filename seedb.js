/**
 * seedb.js — MedClinic API
 *
 * Cria o banco de dados "medclin_db", a tabela "users" e insere
 * usuários fictícios de teste (senhas já hasheadas com bcrypt).
 *
 * Uso:
 *   node seedb.js
 *
 * Pré-requisito: PostgreSQL em execução e variáveis de ambiente
 * configuradas no arquivo .env (ou padrões abaixo serão usados).
 */

require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

// ─── Configuração de conexão ────────────────────────────────────────────────
const DB_HOST   = process.env.DB_HOST   || 'localhost';
const DB_PORT   = Number(process.env.DB_PORT || 5432);
const DB_USER   = process.env.DB_USER   || 'postgres';
const DB_PASS   = process.env.DB_PASS   || 'postgres';
const DB_NAME   = process.env.DB_NAME   || 'medclin_db';

// ─── Usuários fictícios de teste ─────────────────────────────────────────────
const SEED_USERS = [
  {
    name: 'Ana Admin',
    email: 'ana@medclinic.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    name: 'Bruno Admin',
    email: 'bruno@medclinic.com',
    password: 'admin456',
    role: 'admin',
  },
  {
    name: 'Carlos Atendente',
    email: 'carlos@medclinic.com',
    password: 'atendente123',
    role: 'attendant',
  },
  {
    name: 'Daniela Atendente',
    email: 'daniela@medclinic.com',
    password: 'atendente456',
    role: 'attendant',
  },
  {
    name: 'Eduardo Atendente',
    email: 'eduardo@medclinic.com',
    password: 'atendente789',
    role: 'attendant',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function createDatabaseIfNotExists() {
  // Conecta ao banco padrão "postgres" para poder criar o medclin_db
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: 'postgres',
  });

  await client.connect();

  const result = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [DB_NAME],
  );

  if (result.rowCount === 0) {
    await client.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`✅ Banco de dados "${DB_NAME}" criado.`);
  } else {
    console.log(`ℹ️  Banco de dados "${DB_NAME}" já existe — pulando criação.`);
  }

  await client.end();
}

async function createTableIfNotExists(client) {
  await client.query(`
    CREATE TYPE IF NOT EXISTS user_role_enum AS ENUM ('admin', 'attendant');
  `).catch(() => {
    // O tipo já pode existir; ignoramos o erro silenciosamente.
  });

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       VARCHAR(120)  NOT NULL,
      email      VARCHAR(255)  NOT NULL UNIQUE,
      password   VARCHAR(255)  NOT NULL,
      role       VARCHAR(20)   NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP     NOT NULL DEFAULT NOW()
    );
  `);

  console.log('✅ Tabela "users" verificada/criada.');
}

async function seedUsers(client) {
  let inserted = 0;
  let skipped  = 0;

  for (const u of SEED_USERS) {
    // Verifica se o e-mail já existe para não duplicar
    const exists = await client.query(
      'SELECT 1 FROM users WHERE email = $1',
      [u.email],
    );

    if (exists.rowCount > 0) {
      console.log(`  ⚠️  Usuário "${u.email}" já existe — pulando.`);
      skipped++;
      continue;
    }

    const hashed = await bcrypt.hash(u.password, 10);

    await client.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)`,
      [u.name, u.email, hashed, u.role],
    );

    console.log(`  ✅ Inserido: ${u.name} (${u.role}) — ${u.email}`);
    inserted++;
  }

  console.log(`\n📊 Resultado: ${inserted} inseridos, ${skipped} ignorados.`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('🌱 MedClinic API — Seed do banco de dados');
  console.log('==========================================');
  console.log(`   Host:   ${DB_HOST}:${DB_PORT}`);
  console.log(`   Banco:  ${DB_NAME}`);
  console.log(`   Usuário DB: ${DB_USER}`);
  console.log('');

  try {
    // 1. Cria o banco se não existir
    await createDatabaseIfNotExists();

    // 2. Conecta ao medclin_db
    const client = new Client({
      host:     DB_HOST,
      port:     DB_PORT,
      user:     DB_USER,
      password: DB_PASS,
      database: DB_NAME,
    });
    await client.connect();

    // 3. Cria a tabela
    await createTableIfNotExists(client);

    // 4. Insere os usuários fictícios
    console.log('\n👤 Inserindo usuários de teste...');
    await seedUsers(client);

    await client.end();

    console.log('\n✅ Seed concluído com sucesso!');
    console.log('');
    console.log('Credenciais dos usuários inseridos:');
    console.log('────────────────────────────────────────────────────────');

    for (const u of SEED_USERS) {
      const label = u.role === 'admin' ? '🔑 ADMIN    ' : '👤 ATENDENTE';
      console.log(`${label} | ${u.email.padEnd(30)} | senha: ${u.password}`);
    }

    console.log('────────────────────────────────────────────────────────');
    console.log('');
    console.log('Agora execute: npm run dev');
    console.log('');
  } catch (err) {
    console.error('\n❌ Erro durante o seed:', err.message || err);
    console.error('');
    console.error('Verifique:');
    console.error('  1. Se o PostgreSQL está em execução');
    console.error('  2. Se as credenciais no .env estão corretas');
    console.error('  3. Se o usuário do banco tem permissão para criar databases');
    process.exit(1);
  }
}

main();
