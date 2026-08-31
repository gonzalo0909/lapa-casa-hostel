// lapa-casa-hostel/backend/src/config/database.ts

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { logger } from '../utils/logger';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required (see backend/.env)');
}

// rejectUnauthorized:true (auditoría 2026-08-30) asumía que el certificado de
// Supabase valida contra una CA pública ya confiable para Node -- en la
// práctica no fue así (SELF_SIGNED_CERT_IN_CHAIN en producción real, caída
// confirmada). Se había revertido a rejectUnauthorized:false como parche de
// emergencia, pero eso vuelve a dejar la conexión sin verificar el
// certificado del servidor (vulnerable a MITM). En vez de eso, se fija
// explícitamente la CA real de Supabase vía DATABASE_CA_CERT y se mantiene
// rejectUnauthorized:true. Sacar el certificado desde el dashboard de
// Supabase: Project Settings -> Database -> SSL Configuration -> "Download
// certificate", y cargar su contenido (PEM) como variable de entorno en
// Render (con los \n literales, mismo patrón que
// GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).
const databaseCaCert = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n');

if (process.env.NODE_ENV === 'production' && !databaseCaCert) {
  throw new Error(
    'DATABASE_CA_CERT environment variable is required in production ' +
    '(descargar desde Supabase dashboard: Project Settings -> Database -> SSL Configuration)'
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
  idleTimeoutMillis: 30000,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true, ca: databaseCaCert }
    : false
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

export const query = <T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> =>
  pool.query<T>(text, params);

export const getClient = (): Promise<PoolClient> => pool.connect();

export const withTransaction = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const testConnection = async (): Promise<boolean> => {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error });
    return false;
  }
};

export const disconnect = async (): Promise<void> => {
  await pool.end();
  logger.info('Database pool closed');
};

export const connectDatabase = async (): Promise<void> => {
  await testConnection();
};

export default pool;
