import { readFileSync } from "node:fs";
import { Pool, type PoolConfig } from "pg";

// Server-only. URI SSL flags must not override certificate verification.
export function postgresConfig(url: string): PoolConfig {
  const parsed = new URL(url);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol))
    throw new Error("HALO_DATABASE_URL must be a Postgres URI.");
  if ([...parsed.searchParams.keys()].some((key) => key.startsWith("ssl")))
    throw new Error(
      "Configure TLS with HALO_DATABASE_CA_PATH, not URI SSL options.",
    );
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    database: decodeURIComponent(parsed.pathname.slice(1)),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    ssl: {
      rejectUnauthorized: true,
      ...(process.env.HALO_DATABASE_CA_PATH
        ? { ca: readFileSync(process.env.HALO_DATABASE_CA_PATH, "utf8") }
        : {}),
    },
    max: 3,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    statement_timeout: 15000,
    query_timeout: 20000,
    application_name: "halo-forge",
  };
}

export function createPostgresPool(url: string) {
  const pool = new Pool(postgresConfig(url));
  pool.on("error", () =>
    console.error("Halo Forge database connection closed."),
  );
  return pool;
}
