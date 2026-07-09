import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

// Supabase의 pooled connection(pgbouncer, DATABASE_URL)을 런타임 쿼리에 사용한다.
// 마이그레이션은 drizzle.config.ts에서 별도로 direct connection(DIRECT_URL)을 사용한다.
const pool =
  globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
