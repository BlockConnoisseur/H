import { Sandbox } from "@vercel/sandbox";
import { writeFileSync } from "node:fs";

// One-time trusted baseline preparation. No generated candidate code runs here.
async function main() {
  const sandbox = await Sandbox.create({
    resources: { vcpus: 4 },
    timeout: 1_800_000,
    persistent: false,
    networkPolicy: "allow-all",
  });
  let snapshotted = false;
  try {
    await sandbox.mkDir("/vercel/sandbox");
    const packages = await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-lc",
        "apt-get update -qq && apt-get install -y -qq build-essential pkg-config time",
      ],
      sudo: true,
    });
    if (packages.exitCode !== 0)
      throw new Error(
        "Could not install the trusted Rust build prerequisites.",
      );
    const result = await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-lc",
        `
set -euo pipefail
cd /vercel/sandbox
git clone https://github.com/zcash/halo2.git halo2
cd halo2
git checkout --detach 4afa97f221b439450626f2fd03b390e252341e67
command -v cargo >/dev/null || { curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o /tmp/rustup.sh; sh /tmp/rustup.sh -y --profile minimal; }
source "$HOME/.cargo/env"
rustup toolchain install 1.90.0 --profile minimal
rustup override set 1.90.0
cargo generate-lockfile
cargo test --locked -p halo2_proofs --lib --release --no-run
cargo bench --locked -p halo2_proofs --bench msm --no-run
git rev-parse HEAD
sha256sum Cargo.lock
rustc --version
`,
      ],
      cwd: "/vercel/sandbox",
    });
    console.log((await result.stdout()).slice(-2000));
    if (result.exitCode !== 0) {
      console.error((await result.stderr()).slice(-4000));
      throw new Error("Baseline build failed");
    }
    await sandbox.updateNetworkPolicy("deny-all");
    const snapshot = await sandbox.snapshot({
      expiration: 30 * 24 * 60 * 60 * 1000,
    });
    snapshotted = true;
    writeFileSync(
      ".vercel/research-snapshot.json",
      JSON.stringify(
        {
          snapshotId: snapshot.snapshotId,
          createdAt: new Date().toISOString(),
          sourceRevision: "4afa97f221b439450626f2fd03b390e252341e67",
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({ snapshotId: snapshot.snapshotId, ready: true }),
    );
  } finally {
    if (!snapshotted) await sandbox.stop().catch(() => undefined);
  }
}
main().catch((error: unknown) => {
  let message =
    error instanceof Error ? error.message : "Unknown preparation error";
  for (const [key, value] of Object.entries(process.env))
    if (value && value.length > 12 && /TOKEN|KEY|SECRET|DATABASE_URL/.test(key))
      message = message.replaceAll(value, "[redacted]");
  console.error(message.slice(0, 700));
  process.exitCode = 1;
});
