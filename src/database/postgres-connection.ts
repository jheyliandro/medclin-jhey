type Env = NodeJS.ProcessEnv;

export type PostgresSsl = false | { rejectUnauthorized: boolean };

export type PostgresConnectionOptions = {
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  ssl: PostgresSsl;
};

function readSslMode(databaseUrl?: string): string | undefined {
  if (!databaseUrl) {
    return undefined;
  }

  try {
    const parsed = new URL(databaseUrl);
    return parsed.searchParams.get('sslmode')?.toLowerCase() ?? undefined;
  } catch {
    const match = databaseUrl.match(/[?&]sslmode=([^&]+)/i);
    return match?.[1]?.toLowerCase();
  }
}

export function resolvePostgresSsl(
  env: Env = process.env,
  databaseUrl?: string,
): PostgresSsl {
  const sslMode = readSslMode(databaseUrl);
  const dbSsl = env.DB_SSL;
  const rejectUnauthorizedEnv = env.DB_SSL_REJECT_UNAUTHORIZED;
  const isRenderExternal = Boolean(
    databaseUrl && /\.render\.com(?::|\/|\?|$)/i.test(databaseUrl),
  );

  if (dbSsl === 'false' || sslMode === 'disable') {
    return false;
  }

  const wantsSsl =
    dbSsl === 'true' ||
    sslMode === 'require' ||
    sslMode === 'verify-ca' ||
    sslMode === 'verify-full' ||
    sslMode === 'prefer' ||
    isRenderExternal;

  if (!wantsSsl) {
    return false;
  }

  if (rejectUnauthorizedEnv === 'false') {
    return { rejectUnauthorized: false };
  }

  if (rejectUnauthorizedEnv === 'true') {
    return { rejectUnauthorized: true };
  }

  const verify =
    sslMode === 'verify-full' ||
    sslMode === 'verify-ca' ||
    (dbSsl === 'true' && !isRenderExternal);

  return { rejectUnauthorized: verify };
}

export function buildPostgresConnectionOptions(
  env: Env = process.env,
): PostgresConnectionOptions {
  const databaseUrl = env.DATABASE_URL?.trim() || undefined;
  const ssl = resolvePostgresSsl(env, databaseUrl);

  if (databaseUrl) {
    return { url: databaseUrl, ssl };
  }

  return {
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5432),
    username: env.DB_USER ?? 'postgres',
    password: env.DB_PASS ?? 'postgres',
    database: env.DB_NAME ?? 'medclin_db',
    ssl,
  };
}
