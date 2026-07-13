/**
 * Settlement Sense — PostgreSQL client
 * Uses a connection pool via the `pg` library.
 * DATABASE_URL must be set in .env
 */

import { Pool, QueryResult, QueryResultRow } from "pg";

// Prevent creating multiple pools in Next.js hot-reload (dev mode)
declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your .env file.\n" +
      "Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/settlement_sense"
    );
  }
  return new Pool({ connectionString });
}

// Reuse pool across hot-reloads in development
const pool: Pool = globalThis._pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  globalThis._pgPool = pool;
}

/**
 * Run a parameterised SQL query.
 * @param text  - SQL string with $1, $2 … placeholders
 * @param params - Array of parameter values (optional)
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  console.debug(`[DB] query (${duration}ms):`, text.trim().slice(0, 120));
  return result;
}

export default pool;
