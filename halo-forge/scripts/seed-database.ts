import { initialState } from "../src/lib/domain";
import { query, closeStore, storageDriver, transact } from "../src/lib/store";
async function main() {
  if (storageDriver !== "postgres")
    throw new Error("Select the postgres driver before seeding.");
  // Idempotent: never replace user records, import local identities, or create credits.
  await query(
    "INSERT INTO halo_private.app_state(id,data) VALUES(1,$1::jsonb) ON CONFLICT(id) DO NOTHING",
    [JSON.stringify(initialState())],
  );
  await transact(() => undefined);
  console.log(
    "Database initialized. Existing records preserved; platform agents are setup-pending.",
  );
}
main()
  .catch(() => {
    console.error(
      "Database seed failed. Check migration, credentials and TLS configuration.",
    );
    process.exitCode = 1;
  })
  .finally(closeStore);
