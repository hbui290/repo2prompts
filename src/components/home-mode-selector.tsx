"use client";

export type HomeMode = "build" | "review" | "debug" | "migration" | "prompt";
export type HomeDepth = "fast" | "balanced" | "deep" | "focused";
export type HomeVisibleDepth = Exclude<HomeDepth, "focused">;

export const HOME_MODES: Array<{ value: HomeMode; label: string; hint: string }> = [
  { value: "build", label: "Build plan", hint: "Plan the safest implementation path." },
  { value: "review", label: "Code review", hint: "Find risks, missing tests, and review gaps." },
  { value: "debug", label: "Debug issue", hint: "Trace likely failure points." },
  { value: "migration", label: "Migration plan", hint: "Sequence a safer refactor or upgrade." },
];

export const HOME_DEPTHS: Array<{ value: HomeVisibleDepth; label: string; hint: string; level: 1 | 2 | 3 }> = [
  { value: "fast", label: "Fast", hint: "Quick repo scan.", level: 1 },
  { value: "balanced", label: "Balanced", hint: "Best default for most repos.", level: 2 },
  { value: "deep", label: "Deep", hint: "More evidence, slower result.", level: 3 },
];

export function HomeModeSelector({
  mode,
  depth,
  inspectQuestion,
  onModeChange,
  onDepthChange,
  onInspectQuestionChange,
}: {
  mode: HomeMode;
  depth: HomeVisibleDepth;
  inspectQuestion: boolean;
  onModeChange: (mode: HomeMode) => void;
  onDepthChange: (depth: HomeVisibleDepth) => void;
  onInspectQuestionChange: (value: boolean) => void;
}) {
  const selectedMode = HOME_MODES.find((option) => option.value === mode) ?? HOME_MODES[0];
  const selectedDepth = HOME_DEPTHS.find((option) => option.value === depth) ?? HOME_DEPTHS[1];

  return (
    <div className="home-control-stack" aria-label="Homepage report controls">
      <div>
        <span className="control-label">Report type</span>
        <div className="segmented-row compact-scroll">
          {HOME_MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={mode === option.value ? "active" : ""}
              onClick={() => onModeChange(option.value)}
              aria-pressed={mode === option.value}
            >
              <strong>{option.label}</strong>
            </button>
          ))}
        </div>
        <p className="selected-hint">{selectedMode.hint}</p>
      </div>
      <div>
        <span className="control-label">Scan depth</span>
        <div className="depth-card-row" role="radiogroup" aria-label="Scan depth">
          {HOME_DEPTHS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={depth === option.value ? "depth-card active" : "depth-card"}
              onClick={() => onDepthChange(option.value)}
              role="radio"
              aria-checked={depth === option.value}
            >
              <span>
                <strong>{option.label}</strong>
                <small>{option.hint}</small>
              </span>
              <i aria-hidden="true" data-level={option.level}>
                <b />
                <b />
                <b />
              </i>
            </button>
          ))}
        </div>
        <p className="selected-hint">Selected: {selectedDepth.label} scan.</p>
        <label className="question-toggle">
          <input
            checked={inspectQuestion}
            onChange={(event) => onInspectQuestionChange(event.target.checked)}
            type="checkbox"
          />
          <span>
            <strong>Inspect one question</strong>
            <small>Narrow the scan around one specific thing the agent should inspect.</small>
          </span>
        </label>
      </div>
    </div>
  );
}
