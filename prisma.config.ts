// Next.js 자체 런타임은 .env.local을 자동으로 읽지만, Prisma CLI는 별도이므로 여기서 직접 로드한다.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // 마이그레이션 전용: Supabase의 direct(non-pooled) connection 사용.
  // 앱 런타임 연결(DATABASE_URL, pooled)은 src/lib/prisma.ts의 driver adapter가 별도로 사용한다.
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
