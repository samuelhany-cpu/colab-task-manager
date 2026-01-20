import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database cleanup...");

  try {
    // We use a raw query to truncate all tables in the public schema
    // CASCADE ensures that dependent rows are also removed
    // We filter out _prisma_migrations and any other system tables if necessary

    // Get all table names in the public schema
    const tables: { tablename: string }[] = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    const tableNames = tables
      .map((t) => t.tablename)
      .filter((name) => name !== "_prisma_migrations");

    if (tableNames.length === 0) {
      console.log("No tables found to clear.");
      return;
    }

    console.log(`Clearing tables: ${tableNames.join(", ")}`);

    // Truncate all tables in one go with CASCADE
    const truncateQuery = `TRUNCATE TABLE ${tableNames.map((name) => `"${name}"`).join(", ")} CASCADE;`;
    await prisma.$executeRawUnsafe(truncateQuery);

    console.log("Database cleared successfully!");
  } catch (error) {
    console.error("Error clearing database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
