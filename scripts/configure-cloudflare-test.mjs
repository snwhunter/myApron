import { readFileSync, writeFileSync } from "node:fs";

const databaseId = process.argv[2];
const databaseName =
  process.env.MYAPRON_D1_DATABASE_NAME || "myapron-household-test-db";
const bucketName =
  process.env.MYAPRON_R2_BUCKET_NAME || "myapron-household-test-images";

if (!databaseId) {
  throw new Error(
    "Usage: node scripts/configure-cloudflare-test.mjs <d1-database-id>",
  );
}

const baseConfigPath = new URL(
  "../deploy/wrangler.household-test.json",
  import.meta.url,
);
const outputConfigPath = new URL("../wrangler.jsonc", import.meta.url);
const config = JSON.parse(readFileSync(baseConfigPath, "utf8"));

config.d1_databases = [
  {
    binding: "DB",
    database_name: databaseName,
    database_id: databaseId,
    migrations_dir: "drizzle",
  },
];
config.r2_buckets = [
  {
    binding: "BUCKET",
    bucket_name: bucketName,
  },
];

writeFileSync(outputConfigPath, `${JSON.stringify(config, null, 2)}\n`);
