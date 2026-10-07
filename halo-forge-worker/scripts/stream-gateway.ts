import { streamText } from "ai";

const model = "openai/gpt-6-astra";

async function main() {
  if (!process.env.AI_GATEWAY_API_KEY?.trim()) {
    console.error("AI_GATEWAY_API_KEY is missing. Set it in the environment or ignored .env.local.");
    process.exitCode = 1;
    return;
  }

  const result = streamText({
    model,
    prompt: "In three short sentences, describe this proposed research workflow: Halo Forge has three AI agents investigating scalar conversion reuse, memory allocation, and CPU scheduling in Zcash proof generation. They propose patches, and a separate automated test runner measures correctness and performance. Describe it as planned research, not a proven improvement or a live deployment.",
    reasoning: "low",
    maxOutputTokens: 1024,
    maxRetries: 0,
    timeout: 60_000,
    // Handle the stream's error event below, without logging raw requests or headers.
    onError() {},
  });

  let textChunks = 0;
  for await (const part of result.stream) {
    if (part.type === "text-delta") {
      process.stdout.write(part.text);
      textChunks++;
    } else if (part.type === "error") {
      throw part.error;
    } else if (part.type === "abort") {
      throw new Error("Stream aborted");
    }
  }
  if (!textChunks) throw new Error("No text received");

  const [usage, step, finishReason] = await Promise.all([
    result.usage, result.finalStep, result.finishReason,
  ]);
  process.stdout.write("\n\n");
  console.log(JSON.stringify({
    requestedModel: model,
    returnedModel: step.response.modelId,
    finishReason,
    textChunks,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    generationId: step.providerMetadata?.gateway?.generationId,
  }, null, 2));
  if (finishReason !== "stop") process.exitCode = 1;
}

main().catch((error: unknown) => {
  const status = error && typeof error === "object" && "statusCode" in error
    && typeof error.statusCode === "number" ? error.statusCode : undefined;
  const messages: Record<number, string> = {
    401: "Check the AI Gateway key; authentication was rejected.",
    402: "Check AI Gateway credits and spending limits.",
    403: "Check team verification and model access in Vercel.",
    429: "AI Gateway is rate limited. Retry later.",
  };
  console.error(`\nStreaming failed${status ? ` (HTTP ${status})` : ""}. ${status ? messages[status] ?? "Check AI Gateway logs." : "Check AI Gateway logs or request timeout."}`);
  process.exitCode = 1;
});
