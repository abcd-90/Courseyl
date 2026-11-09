import { runSeed } from "../src/lib/seed";
import { prisma } from "../src/lib/db";

async function main() {
  await runSeed();
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});

