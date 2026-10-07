// A retry always carries the same request ID or exact signed transaction.
// Never turn a transient HTTP failure into a new wallet approval.
export async function launchRequest(
  body: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
  wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
) {
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetcher("/api/pump/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      if (attempt < 2) {
        await wait(1500 * (attempt + 1));
        continue;
      }
      throw new Error(
        "Connection interrupted. Your launch is saved. Resume deployment to check the recorded transaction before approving anything again.",
      );
    }
    if ([502, 503, 504, 429].includes(response.status) && attempt < 2) {
      await wait(response.status === 429 ? 8000 : 1500 * (attempt + 1));
      continue;
    }
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.launch)
      throw new Error(
        data?.error ||
          "Launch service is temporarily unavailable. Your progress is saved; resume this deployment to continue.",
      );
    return data.launch;
  }
}
