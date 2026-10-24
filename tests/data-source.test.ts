import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('database connection configuration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses DATABASE_URL with TLS when configured', async () => {
    vi.stubEnv(
      'DATABASE_URL',
      'postgres://user:password@db.example.com/medclin?sslmode=verify-full',
    );
    vi.stubEnv('DB_SSL', 'true');

    const { AppDataSource } = await import('../src/database/data-source');

    expect(AppDataSource.options).toMatchObject({
      url: 'postgres://user:password@db.example.com/medclin?sslmode=verify-full',
      ssl: { rejectUnauthorized: true },
    });
    expect(AppDataSource.options).not.toHaveProperty('host');
  });

  it('enables TLS without certificate pinning for Render external hosts', async () => {
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://user:password@dpg-example-a.oregon-postgres.render.com/medclin',
    );
    vi.stubEnv('DB_SSL', '');
    vi.stubEnv('DB_SSL_REJECT_UNAUTHORIZED', '');

    const { AppDataSource } = await import('../src/database/data-source');

    expect(AppDataSource.options).toMatchObject({
      url: 'postgresql://user:password@dpg-example-a.oregon-postgres.render.com/medclin',
      ssl: { rejectUnauthorized: false },
    });
  });

  it('does not force TLS for a Render internal URL without sslmode', async () => {
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://user:password@dpg-example-a/medclin',
    );
    vi.stubEnv('DB_SSL', '');

    const { AppDataSource } = await import('../src/database/data-source');

    expect(AppDataSource.options).toMatchObject({
      url: 'postgresql://user:password@dpg-example-a/medclin',
      ssl: false,
    });
  });

  it('retains individual DB_* settings when DATABASE_URL is absent', async () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('DB_HOST', 'postgres.internal');
    vi.stubEnv('DB_PORT', '5433');
    vi.stubEnv('DB_USER', 'medclin');
    vi.stubEnv('DB_PASS', 'test-password');
    vi.stubEnv('DB_NAME', 'medclin_test');
    vi.stubEnv('DB_SSL', 'false');

    const { AppDataSource } = await import('../src/database/data-source');

    expect(AppDataSource.options).toMatchObject({
      host: 'postgres.internal',
      port: 5433,
      username: 'medclin',
      password: 'test-password',
      database: 'medclin_test',
      ssl: false,
    });
    expect(AppDataSource.options).not.toHaveProperty('url');
  });
});
