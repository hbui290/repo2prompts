export async function GET() {
  return Response.json({
    app: "ok",
    github: process.env.GITHUB_API_TOKEN ? "configured" : "anonymous",
    chat:
      process.env.MODEL_BASE_URL &&
      process.env.MODEL_API_KEY &&
      process.env.MODEL_CHAT_ID
        ? "configured"
        : "disabled",
    embeddings: "disabled",
    database:
      process.env.DATABASE_REST_URL && process.env.DATABASE_SERVICE_KEY
        ? "configured"
        : "disabled",
    rateLimit: {
      windowMs: process.env.RATE_LIMIT_WINDOW_MS ?? "600000",
      max: process.env.RATE_LIMIT_MAX ?? "10",
    },
  });
}
