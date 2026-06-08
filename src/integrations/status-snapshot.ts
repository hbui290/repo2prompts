export type StatusSnapshot = {
  app: "ok";
  github: "configured" | "anonymous";
  chat: "configured" | "disabled";
  embeddings: "disabled";
  database: "configured" | "disabled";
  rateLimit: {
    backend: string;
    dbFailureMode: string;
    windowMs: string;
    max: string;
  };
};

export function getStatusSnapshot(): StatusSnapshot {
  return {
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
      backend: process.env.RATE_LIMIT_BACKEND ?? "memory",
      dbFailureMode: process.env.RATE_LIMIT_DB_FAILURE_MODE ?? "open",
      windowMs: process.env.RATE_LIMIT_WINDOW_MS ?? "600000",
      max: process.env.RATE_LIMIT_MAX ?? "10",
    },
  };
}
