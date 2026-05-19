// Initialize the Turso database with the schema and (optionally) seed data.
// Run with: npm run db:init
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import "dotenv/config";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("Set TURSO_DATABASE_URL in .env");

  const client = createClient({ url, authToken });

  const schemaSql = readFileSync(
    join(process.cwd(), "lib", "schema.sql"),
    "utf-8"
  );

  console.log("Running schema...");
  // executeMultiple runs the whole DDL script in one go and avoids the
  // libsql migration-job polling that can 400 on fresh databases.
  await client.executeMultiple(schemaSql);
  console.log("✓ Schema applied");

  // Check if employees table is empty; if so, seed placeholders.
  const { rows } = await client.execute("SELECT COUNT(*) AS c FROM employees");
  const count = Number(rows[0].c);
  if (count === 0) {
    console.log("\nSeeding placeholder employees...");
    const seed = [
      ["Maria Rodriguez", "maria@fatty-chem.com", "Operations", 20],
      ["Carlos Mendez", "carlos@fatty-chem.com", "Production", 20],
      ["Ana Torres", "ana@fatty-chem.com", "Quality", 18],
      ["Luis Ramirez", "luis@fatty-chem.com", "Maintenance", 22],
      ["Sofia Lopez", "sofia@fatty-chem.com", "Admin", 25],
    ] as const;
    for (const [name, email, dept, days] of seed) {
      await client.execute({
        sql: "INSERT INTO employees (full_name, email, department, annual_pto_days) VALUES (?,?,?,?)",
        args: [name, email, dept, days],
      });
    }
    console.log(`✓ Seeded ${seed.length} employees`);
  } else {
    console.log(`\nEmployees table already has ${count} rows — skipping seed.`);
  }

  console.log("\n✅ Database initialized successfully.");

  // Force-close so Node doesn't hang on Windows
  client.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Init failed:", err.message || err);
  console.error(
    "\nTroubleshooting:\n" +
      "  1. Verify TURSO_DATABASE_URL starts with libsql://\n" +
      "  2. Verify TURSO_AUTH_TOKEN starts with eyJ\n" +
      "  3. Make sure there are no quotes or trailing spaces in .env\n"
  );
  process.exit(1);
});
