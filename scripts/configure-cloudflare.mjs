import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const databaseId = process.argv[2];

if (!databaseId) {
  throw new Error("Usage: node scripts/configure-cloudflare.mjs <d1-database-id>");
}

const baseConfigPath = new URL("../deploy/wrangler.base.json", import.meta.url);
const outputConfigPath = new URL("../wrangler.jsonc", import.meta.url);
const migrationsDirectory = new URL("../.wrangler/", import.meta.url);
const migrationsConfigPath = new URL(
  "../.wrangler/migrations.json",
  import.meta.url,
);
const config = JSON.parse(readFileSync(baseConfigPath, "utf8"));

writeFileSync(outputConfigPath, `${JSON.stringify(config, null, 2)}\n`);

mkdirSync(migrationsDirectory, { recursive: true });
writeFileSync(
  migrationsConfigPath,
  `${JSON.stringify(
    {
      name: "myapron",
      compatibility_date: config.compatibility_date,
      d1_databases: [
        {
          binding: "DB",
          database_name: "myapron-db",
          database_id: databaseId,
          migrations_dir: "drizzle",
        },
      ],
    },
    null,
    2,
  )}\n`,
);
