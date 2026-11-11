import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
  pool: Pool | undefined;
};

function getConnectionString(): string {
  let conn = process.env.DATABASE_URL || "";
  // Auto-switch Supabase pooler from session mode (5432) to transaction mode (6543)
  // to avoid (EMAXCONNSESSION) max clients reached in session mode
  if (conn.includes(".pooler.supabase.com:5432")) {
    conn = conn.replace(".pooler.supabase.com:5432", ".pooler.supabase.com:6543");
  }
  return conn;
}

function createPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const connectionString = getConnectionString();
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: process.env.NODE_ENV === "production" ? 3 : 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 25000,
    });

  globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  globalForPrisma.prisma = client;
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

export default prisma;
