import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Pool, QueryResultRow } from "pg";
import { createPostgresPool } from "./postgres";
import { initialState, ensureResearchSetup, type State } from "./domain";

const driver =
  process.env.HALO_DATABASE_DRIVER ||
  (process.env.HALO_DATABASE_URL ? "postgres" : "sqlite");
if (driver !== "postgres" && driver !== "sqlite")
  throw new Error("HALO_DATABASE_DRIVER must be postgres or sqlite.");
if (driver === "postgres" && !process.env.HALO_DATABASE_URL)
  throw new Error("Postgres requires HALO_DATABASE_URL.");
export const storageDriver = driver;
const root = globalThis as typeof globalThis & {
  haloDb?: DatabaseSync;
  haloPool?: Pool;
};
let sqlite: DatabaseSync | undefined;
let pool: Pool | undefined;
if (driver === "postgres") {
  pool = root.haloPool ??= createPostgresPool(process.env.HALO_DATABASE_URL!);
} else {
  const path =
    process.env.HALO_DATABASE_PATH ||
    resolve(process.cwd(), ".data/halo.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  sqlite = root.haloDb ??= new DatabaseSync(path);
  sqlite.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS app_state(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,wallet TEXT NOT NULL,preview INTEGER NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS nonces(id TEXT PRIMARY KEY,message TEXT NOT NULL,wallet TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset INTEGER NOT NULL);`);
  sqlite
    .prepare("INSERT OR IGNORE INTO app_state(id,data) VALUES(1,?)")
    .run(JSON.stringify(initialState(process.env.HALO_EMPTY_STATE !== "true")));
}

// Internal SQL only; identifiers never come from a request or a model.
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: SQLInputValue[] = [],
): Promise<T[]> {
  if (pool) return (await pool.query<T>(sql, values)).rows;
  const ordered: SQLInputValue[] = [];
  const statement = sql
    .replaceAll("halo_private.", "")
    .replace(/\$(\d+)/g, (_, index) => {
      ordered.push(values[Number(index) - 1]);
      return "?";
    });
  return sqlite!.prepare(statement).all(...ordered) as T[];
}

function synchronous<T>(fn: (state: State) => T, state: State): T {
  const result = fn(state);
  if (result && typeof (result as { then?: unknown }).then === "function")
    throw new Error("State transactions must use synchronous callbacks.");
  return result;
}

export async function transact<T>(fn: (state: State) => T): Promise<T> {
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query(
        "SET LOCAL idle_in_transaction_session_timeout = '15s'",
      );
      const { rows } = await client.query<{ data: State }>(
        "SELECT data FROM halo_private.app_state WHERE id=1 FOR UPDATE",
      );
      if (!rows[0])
        throw new Error("Database is not initialized. Run npm run db:seed.");
      const state = rows[0].data;
      ensureResearchSetup(state, process.env.HALO_EMPTY_STATE !== "true");
      const result = synchronous(fn, state);
      await client.query(
        "UPDATE halo_private.app_state SET data=$1::jsonb WHERE id=1",
        [JSON.stringify(state)],
      );
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
  sqlite!.exec("BEGIN IMMEDIATE");
  try {
    const row = sqlite!
      .prepare("SELECT data FROM app_state WHERE id=1")
      .get() as { data: string };
    const state = JSON.parse(row.data) as State;
    ensureResearchSetup(state, process.env.HALO_EMPTY_STATE !== "true");
    const result = synchronous(fn, state);
    sqlite!
      .prepare("UPDATE app_state SET data=? WHERE id=1")
      .run(JSON.stringify(state));
    sqlite!.exec("COMMIT");
    return result;
  } catch (error) {
    sqlite!.exec("ROLLBACK");
    throw error;
  }
}

export async function readState(): Promise<State> {
  const [row] = await query<{ data: string | State }>(
    "SELECT data FROM halo_private.app_state WHERE id=1",
  );
  if (!row)
    throw new Error("Database is not initialized. Run npm run db:seed.");
  const state: State =
    typeof row.data === "string" ? JSON.parse(row.data) : row.data;
  ensureResearchSetup(state, process.env.HALO_EMPTY_STATE !== "true");
  return state;
}

export async function closeStore() {
  if (pool) {
    await pool.end();
    delete root.haloPool;
  }
  if (sqlite) {
    sqlite.close();
    delete root.haloDb;
  }
}
