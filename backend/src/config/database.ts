// lapa-casa-hostel/backend/src/config/database.ts

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { logger } from '../utils/logger';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required (see backend/.env)');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
  idleTimeoutMillis: 30000,
  // rejectUnauthorized:true (auditoría 2026-08-30) asumía que el certificado
  // de Supabase valida contra una CA pública ya confiable para Node -- en la
  // práctica no fue así: produjo SELF_SIGNED_CERT_IN_CHAIN en producción real
  // (caída confirmada, Render "Failed deploy" durante horas). Se revierte a
  // rejectUnauthorized:false -- la conexión sigue viajando cifrada por TLS,
  // solo no se valida la cadena del certificado contra el store de Node
  // (el mismo riesgo teórico de MITM que ya existía antes de la 2026-08-30).
  // PENDIENTE: endurecer de nuevo pasando el certificado CA real de Supabase
  // (Settings → Database → SSL Configuration en el dashboard) vía `ca:` en
  // vez de sacar la verificación por completo.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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
