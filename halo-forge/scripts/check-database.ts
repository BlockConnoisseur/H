import { query, closeStore, storageDriver, readState } from "../src/lib/store";
async function main() {
  if (storageDriver !== "postgres")
    throw new Error("Select postgres to check Supabase.");
  const [identity] = await query<{ role: string }>(
    "SELECT current_user AS role",
  );
  if (identity.role !== "halo_app")
    throw new Error("Use the restricted halo_app account.");
  const state = await readState();
  const tables = await query<{ name: string; rls: boolean }>(
    "SELECT relname AS name, relrowsecurity AS rls FROM pg_class JOIN pg_namespace n ON n.oid=relnamespace WHERE n.nspname='halo_private' AND relkind='r'",
  );
  if (tables.length !== 4 || tables.some((t) => !t.rls))
    throw new Error("Database access configuration is incomplete.");
  console.log(
    JSON.stringify({
      connected: true,
      driver: storageDriver,
      role: identity.role,
      tables: tables.length,
      rowLevelSecurity: true,
      platformAgents: state.agents.filter((a) => a.platform).length,
    }),
  );
}
main()
  .catch(() => {
    console.error(
      "Database verification failed. Check migration, credentials and TLS configuration.",
    );
    process.exitCode = 1;
  })
  .finally(closeStore);
