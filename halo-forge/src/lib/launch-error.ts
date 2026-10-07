// Classify failures without logging provider URLs, SQL, credentials or wallets.
export function launchErrorKind(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (
    /max.?clients|too many (clients|connections)|remaining connection slots|pool.*(full|timeout)|timeout.*connection/i.test(
      message,
    )
  )
    return "database_capacity";
  if (/blockhash.*not found|block height exceeded/i.test(message))
    return "blockhash_expired";
  if (/429|too many requests|rate limit/i.test(message))
    return "provider_rate_limit";
  if (
    /timeout|timed out|fetch failed|ECONNRESET|ECONNREFUSED|connection terminated/i.test(
      message,
    )
  )
    return "connection_interrupted";
  if (/insufficient (funds|lamports)/i.test(message))
    return "insufficient_funds";
  return "unexpected_service_failure";
}

export function serviceErrorDetails(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  return {
    kind: launchErrorKind(error),
    code: /^[A-Z0-9_]{1,40}$/.test(code) ? code : undefined,
    type:
      error instanceof Error && /^[A-Za-z]{1,40}$/.test(error.name)
        ? error.name
        : "unknown",
  };
}
