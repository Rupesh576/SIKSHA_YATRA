import { Pool } from "pg";

declare global {
  var pgPool: Pool | undefined;
}

export function getPool() {
  if (!global.pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not configured");
    global.pgPool = new Pool({
      connectionString,
      max: 5,
      ssl: { rejectUnauthorized: false },
    });
  }
  return global.pgPool;
}
