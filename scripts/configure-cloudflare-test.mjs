import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const databaseId = process.argv[2];
const databaseName =
  process.env.MYAPRON_D1_DATABASE_NAME || "myapron-household-test-db";

if (!databaseId) {
  throw new Error(
    "Usage: node scripts/configure-cloudflare-test.mjs <d1-database-id>",
  );
}

const baseConfigPath = new URL(
  "../deploy/wrangler.household-test.json",
  import.meta.url,
);
const deployConfigPath = new URL("../wrangler.jsonc", import.meta.url);
const migrationDirectory = new URL("../.wrangler/", import.meta.url);
const migrationConfigPath = new URL(
  "../.wrangler/household-test-migrations.json",
  import.meta.url,
);
const deployConfig = JSON.parse(readFileSync(baseConfigPath, "utf8"));

writeFileSync(deployConfigPath, `${JSON.stringify(deployConfig, null, 2)}\n`);

const migrationConfig = {
  ...deployConfig,
  d1_databases: [
    {
      binding: "DB",
      database_name: databaseName,
      database_id: databaseId,
      migrations_dir: "../drizzle",
    },
  ],
};

mkdirSync(migrationDirectory, { recursive: true });
writeFileSync(
  migrationConfigPath,
  `${JSON.stringify(migrationConfig, null, 2)}\n`,
);
