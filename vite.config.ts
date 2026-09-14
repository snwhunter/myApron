import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;
const isCloudflareDeploy = process.env.MYAPRON_CLOUDFLARE_DEPLOY === "1";
const deploymentDatabaseId = process.env.MYAPRON_D1_DATABASE_ID;
const deploymentDatabaseName =
  process.env.MYAPRON_D1_DATABASE_NAME || "myapron-household-test-db";
const deploymentBucketName =
  process.env.MYAPRON_R2_BUCKET_NAME || "myapron-household-test-images";

if (isCloudflareDeploy && !deploymentDatabaseId) {
  throw new Error(
    "MYAPRON_D1_DATABASE_ID is required when MYAPRON_CLOUDFLARE_DEPLOY=1",
  );
}

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: isCloudflareDeploy
            ? deploymentDatabaseName
            : "site-creator-d1",
          database_id: isCloudflareDeploy
            ? deploymentDatabaseId!
            : SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: isCloudflareDeploy
            ? deploymentBucketName
            : "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    ],
  };
});
