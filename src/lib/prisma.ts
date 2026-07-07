import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Supabase의 pooled connection(pgbouncer, DATABASE_URL)을 런타임 쿼리에 사용한다.
// 마이그레이션은 prisma.config.ts에서 별도로 direct connection(DIRECT_URL)을 사용한다.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
