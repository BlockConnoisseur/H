import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { initialState, ensureResearchSetup, type State } from "./domain";
const path =
  process.env.HALO_DATABASE_PATH || resolve(process.cwd(), ".data/halo.sqlite");
mkdirSync(dirname(path), { recursive: true });
const root = globalThis as typeof globalThis & { haloDb?: DatabaseSync };
export const db = (root.haloDb ??= new DatabaseSync(path));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS app_state(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,wallet TEXT NOT NULL,preview INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS nonces(id TEXT PRIMARY KEY,message TEXT NOT NULL,wallet TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset INTEGER NOT NULL);`);
db.prepare("INSERT OR IGNORE INTO app_state(id,data) VALUES(1,?)").run(
  JSON.stringify(initialState(process.env.HALO_EMPTY_STATE !== "true")),
);
export function readState(): State {
  return JSON.parse(
    (
      db.prepare("SELECT data FROM app_state WHERE id=1").get() as {
        data: string;
      }
    ).data,
  );
}
export function transact<T>(fn: (state: State) => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const state = readState();
    const result = fn(state);
    db.prepare("UPDATE app_state SET data=? WHERE id=1").run(
      JSON.stringify(state),
    );
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

// Idempotent migration preserves all existing user records and ledger entries.
transact((state) =>
  ensureResearchSetup(state, process.env.HALO_EMPTY_STATE !== "true"),
);
