import { defineConfig, loadEnv, Modules } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV ?? "development", process.cwd());

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * `medusa build` loads this file with NODE_ENV=production but without the
 * runtime secrets, so production-only requirements are checked when the
 * server starts, not when the image is built.
 */
const IS_BUILD = process.argv.includes("build");

function env(name: string, fallback?: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing environment variable ${name}`);
}

/** Required at runtime in production, optional in development and during builds. */
function productionEnv(name: string, devFallback: string): string {
  return IS_PRODUCTION && !IS_BUILD ? env(name) : env(name, devFallback);
}

const BACKEND_URL = env("MEDUSA_BACKEND_URL", "http://localhost:9000");
const REDIS_URL = IS_PRODUCTION && !IS_BUILD ? env("REDIS_URL") : process.env.REDIS_URL;

/**
 * Cache, event bus, workflow engine and locking run in memory in
 * development (Medusa defaults). Production uses Redis.
 */
const redisModules =
  IS_PRODUCTION && REDIS_URL
    ? [
        {
          key: Modules.CACHE,
          resolve: "@medusajs/medusa/cache-redis",
          options: { redisUrl: REDIS_URL },
        },
        {
          key: Modules.EVENT_BUS,
          resolve: "@medusajs/medusa/event-bus-redis",
          options: { redisUrl: REDIS_URL },
        },
        {
          key: Modules.WORKFLOW_ENGINE,
          resolve: "@medusajs/medusa/workflow-engine-redis",
          options: { redis: { redisUrl: REDIS_URL } },
        },
        {
          key: Modules.LOCKING,
          resolve: "@medusajs/medusa/locking",
          options: {
            providers: [
              {
                resolve: "@medusajs/medusa/locking-redis",
                id: "locking-redis",
                is_default: true,
                options: { redisUrl: REDIS_URL },
              },
            ],
          },
        },
      ]
    : [];

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: env("DATABASE_URL", IS_BUILD ? "" : undefined),
    ...(REDIS_URL && IS_PRODUCTION ? { redisUrl: REDIS_URL } : {}),
    workerMode:
      (process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server" | undefined) ?? "shared",
    http: {
      storeCors: env("STORE_CORS", "http://localhost:3000"),
      adminCors: env("ADMIN_CORS", "http://localhost:9000"),
      authCors: env("AUTH_CORS", "http://localhost:9000,http://localhost:3000"),
      jwtSecret: productionEnv("JWT_SECRET", "dev-only-jwt-secret"),
      cookieSecret: productionEnv("COOKIE_SECRET", "dev-only-cookie-secret"),
    },
  },
  admin: {
    disable: process.env.DISABLE_ADMIN === "true",
    backendUrl: BACKEND_URL,
  },
  featureFlags: {
    translation: true,
  },
  modules: [
    { resolve: "@medusajs/medusa/translation" },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-local",
            id: "local",
            options: {
              upload_dir: env("FILE_UPLOAD_DIR", "static"),
              backend_url: env("FILE_BASE_URL", `${BACKEND_URL}/static`),
            },
          },
        ],
      },
    },
    ...redisModules,
  ],
});
