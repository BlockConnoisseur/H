import { defineAgent } from "eve";

export default defineAgent({
  model: "openai/gpt-6-luna-fast",
  reasoning: "high",
  defaultTools: false,
  limits: {
    maxInputTokensPerSession: 200_000,
    maxOutputTokensPerSession: 20_000,
    maxTokenCostUsdPerSession: 5,
    sessionTimeoutMs: 30 * 60 * 1000,
  },
});
