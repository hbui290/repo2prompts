export type LogLevel = "info" | "warn" | "error";

export type SafeLogEvent = {
  route: string;
  requestId: string;
  event: string;
  code?: string;
  repository?: string;
  mode?: string;
  depth?: string;
  durationMs?: number;
  source?: string;
};

type Logger = Record<LogLevel, (value: string) => void>;

function safePayload(event: SafeLogEvent): SafeLogEvent {
  return {
    route: event.route,
    requestId: event.requestId,
    event: event.event,
    code: event.code,
    repository: event.repository,
    mode: event.mode,
    depth: event.depth,
    durationMs: event.durationMs,
    source: event.source,
  };
}

export function logServerEvent(
  level: LogLevel,
  event: SafeLogEvent,
  logger: Logger = console,
): void {
  logger[level](JSON.stringify(safePayload(event)));
}
