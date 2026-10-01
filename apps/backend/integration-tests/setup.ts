import { loadEnv } from "@medusajs/framework/utils";
import { register } from "ts-node";

/**
 * Medusa loads modules with Node's own `require`, outside Vite's transform
 * pipeline (Jest does the same through @swc/jest). Register ts-node with SWC
 * so `resolve: "./src/modules/..."` can load TypeScript sources.
 */
register({ transpileOnly: true, swc: true, compilerOptions: { module: "commonjs" } });

/**
 * @medusajs/test-utils reads DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD and
 * DB_TEMP_NAME. They are derived from DB_TEST_URL (apps/backend/.env).
 * The runner never creates or drops the database: essadrati_test must exist.
 */
loadEnv("test", process.cwd());

const raw = process.env.DB_TEST_URL;
if (!raw) throw new Error("DB_TEST_URL is not set: see apps/backend/.env.example");

const url = new URL(raw);
process.env.DB_HOST = url.hostname;
process.env.DB_PORT = url.port || "5432";
process.env.DB_USERNAME = decodeURIComponent(url.username);
process.env.DB_PASSWORD = decodeURIComponent(url.password);
process.env.DB_TEMP_NAME = url.pathname.replace(/^\//, "");
