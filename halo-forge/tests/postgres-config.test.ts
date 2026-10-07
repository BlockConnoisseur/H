import { test } from "node:test";
import assert from "node:assert/strict";
import { postgresConfig } from "../src/lib/postgres";

test("Postgres config decodes credentials and requires certificate verification", () => {
  const config = postgresConfig(
    "postgresql://app:test%24%40%23@localhost:5432/postgres",
  );
  assert.equal(config.password, "test$@#");
  assert.equal(config.user, "app");
  assert.equal(config.max, 3);
  assert.ok(config.ssl && typeof config.ssl === "object");
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.throws(() =>
    postgresConfig("postgresql://app:test@localhost/postgres?sslmode=disable"),
  );
  assert.throws(() => postgresConfig("https://localhost/postgres"));
});
