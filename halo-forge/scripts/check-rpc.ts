// Read-only checks. Never log credential-bearing URLs or raw provider errors.
const networks = [
  {
    name: "mainnet",
    variable: "SOLANA_MAINNET_RPC_URL",
    genesis: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
  },
  {
    name: "devnet",
    variable: "SOLANA_DEVNET_RPC_URL",
    genesis: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
  },
];

async function check(network: (typeof networks)[number]) {
  const endpoint = process.env[network.variable];
  if (!endpoint) {
    console.error(`${network.name}: ${network.variable} is missing.`);
    process.exitCode = 1;
    return;
  }
  try {
    if (new URL(endpoint).protocol !== "https:")
      throw new Error("HTTPS required");
    const call = async (method: "getHealth" | "getGenesisHash") => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: method, method }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error("RPC HTTP failure");
      const data = await response.json();
      // Helius devnet's health response can omit the request ID.
      // Genesis-hash replies must still match the request exactly.
      const matchedId =
        data.id === method || (method === "getHealth" && data.id === undefined);
      if (data.error || !matchedId || data.jsonrpc !== "2.0")
        throw new Error("RPC response failure");
      return data.result;
    };
    const [health, genesis] = await Promise.all([
      call("getHealth"),
      call("getGenesisHash"),
    ]);
    const healthy = health === "ok";
    const correctNetwork = genesis === network.genesis;
    console.log(
      JSON.stringify({ network: network.name, healthy, correctNetwork }),
    );
    if (!healthy || !correctNetwork) process.exitCode = 1;
  } catch {
    console.error(
      `${network.name}: RPC check failed. Check credentials, connectivity and provider limits.`,
    );
    process.exitCode = 1;
  }
}

void Promise.all(networks.map(check));
