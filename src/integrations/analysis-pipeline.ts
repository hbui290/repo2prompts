import { createBriefIdentity } from "@/domain/brief-identity";
import { buildBriefPrompt, requiredHeadings, type AnalysisDepth, type AnalysisMode } from "@/domain/brief-prompt";
import { validateBriefQuality, type BriefQuality } from "@/domain/brief-quality";
import { classifyFile } from "@/domain/file-analysis";
import { groupRepositoryModules } from "@/domain/module-grouping";
import { buildRelationshipGraph } from "@/domain/relationship-graph";
import {
  fallbackRepositoryMap,
  mergeRepositoryMaps,
  validateRepositoryMap,
  type RepositoryMap,
} from "@/domain/repository-map";
import { parseRepositoryId, type RepositoryId } from "@/domain/repository-id";
import {
  readStoredAnalysis,
  readStoredBrief,
  saveStoredAnalysis,
  saveStoredBrief,
  type AnalysisCacheIdentity,
  type StoredEvidence,
} from "./brief-store";
import { collectRepositoryEvidence, type RepositoryEvidence } from "./github-reader";
import { requestModelJson, requestModelText, type ModelTask } from "./model-client";

export type AnalysisMetadata = {
  pipeline: "single_pass" | "repository_map" | "module_map";
  repositoryMapSource: "generated" | "cache" | "not_used";
  modulesAnalyzed: number;
  evidenceFingerprint: string;
  quality: BriefQuality;
};

export type AnalysisPipelineInput = {
  repository: string;
  mode: AnalysisMode;
  depth: AnalysisDepth;
  question: string | null;
  include?: string;
  exclude?: string;
};

export type AnalysisPipelineResult = {
  brief: string;
  source: "generated" | "cache";
  mode: AnalysisMode;
  depth: AnalysisDepth;
  evidence: StoredEvidence;
  analysis: AnalysisMetadata;
};

export type AnalysisPipelineDependencies = {
  collectEvidence: (
    id: RepositoryId,
    depth: AnalysisDepth,
    mode: AnalysisMode,
    filters: { include?: string; exclude?: string; question?: string | null },
  ) => Promise<RepositoryEvidence>;
  readBrief: typeof readStoredBrief;
  saveBrief: typeof saveStoredBrief;
  readAnalysis: typeof readStoredAnalysis;
  saveAnalysis: typeof saveStoredAnalysis;
  requestText: (task: ModelTask, prompt: string) => Promise<string>;
  requestJson: <T>(task: ModelTask, prompt: string) => Promise<T>;
};

const defaultDependencies: AnalysisPipelineDependencies = {
  collectEvidence: collectRepositoryEvidence,
  readBrief: readStoredBrief,
  saveBrief: saveStoredBrief,
  readAnalysis: readStoredAnalysis,
  saveAnalysis: saveStoredAnalysis,
  requestText: requestModelText,
  requestJson: requestModelJson,
};

function responseEvidence(evidence: RepositoryEvidence, analysis: AnalysisMetadata): StoredEvidence {
  return {
    filesRead: evidence.files.length,
    treeEntries: evidence.treeEntries,
    estimatedTokens: evidence.selection.estimatedTokens,
    selectedFiles: evidence.selection.selected.map((file) => ({
      path: file.path,
      size: file.size,
      reason: file.reason,
      estimatedTokens: file.estimatedTokens,
    })),
    skippedFiles: evidence.selection.skipped.map((file) => ({ path: file.path, reason: file.reason })),
    largestFiles: evidence.selection.largestFiles,
    analysis,
  };
}

function mapPrompt(input: AnalysisPipelineInput, evidence: RepositoryEvidence, scope: string): string {
  return `Analyze this repository evidence and return one JSON RepositoryMap.
Scope: ${scope}
Repository: ${parseRepositoryId(input.repository).key}
Mode: ${input.mode}
Focused question: ${input.question ?? "none"}
Valid files: ${evidence.files.map((file) => file.path).join(", ")}

Required JSON keys: purpose, entrypoints, modules, dataFlows, integrations, risks, unknowns.
Each claim must contain claim, files, confidence. Cite only valid files.

Evidence:
${evidence.files.map((file) => `--- ${file.path} ---\n${file.content}`).join("\n")}`;
}

function writerPrompt(input: AnalysisPipelineInput, evidence: RepositoryEvidence, repositoryMap: RepositoryMap): string {
  return `Write an evidence-grounded ${input.mode} brief in Markdown.
Repository: ${parseRepositoryId(input.repository).key}
Depth: ${input.depth}
Focused question: ${input.question ?? "none"}
Use these exact top-level headings:
${requiredHeadings(input.mode).map((heading) => `# ${heading}`).join("\n")}

Use citations like [src/file.ts]. Label inference and unknowns.
Repository map:
${JSON.stringify(repositoryMap)}

Representative evidence:
${evidence.files.slice(0, 10).map((file) => `--- ${file.path} ---\n${file.content}`).join("\n")}`;
}

function repairPrompt(brief: string, warnings: string[], selectedPaths: string[]): string {
  return `Repair this Markdown brief. Fix only these quality issues:
${warnings.map((warning) => `- ${warning}`).join("\n")}
Valid citation paths: ${selectedPaths.join(", ")}

Brief:
${brief}`;
}

function analysisIdentity(
  input: AnalysisPipelineInput,
  evidence: RepositoryEvidence,
  questionHash: string,
): AnalysisCacheIdentity {
  return {
    repositoryKey: parseRepositoryId(input.repository).key,
    resolvedRef: evidence.resolvedRef,
    repositoryPath: evidence.repositoryPath,
    evidenceFingerprint: evidence.evidenceFingerprint,
    scope: input.depth === "focused" ? "focused" : input.depth === "deep" ? "deep" : "general",
    questionHash: input.depth === "focused" ? questionHash : "none",
  };
}

async function deepRepositoryMap(
  input: AnalysisPipelineInput,
  evidence: RepositoryEvidence,
  deps: AnalysisPipelineDependencies,
): Promise<{ map: RepositoryMap; modulesAnalyzed: number }> {
  const graphFiles = evidence.files.map((file) => ({
    path: file.path,
    content: file.content,
    role: classifyFile(file.path),
    estimatedTokens: Math.ceil(file.content.length / 4),
  }));
  const graph = buildRelationshipGraph(graphFiles);
  const modules = groupRepositoryModules(graphFiles, graph);
  const maps: RepositoryMap[] = [];
  for (let offset = 0; offset < modules.length; offset += 3) {
    const results = await Promise.all(
      modules.slice(offset, offset + 3).map(async (module) => {
        const moduleEvidence: RepositoryEvidence = {
          ...evidence,
          files: evidence.files.filter((file) => module.files.includes(file.path)),
        };
        try {
          const raw = await deps.requestJson<RepositoryMap>("module_analysis", mapPrompt(input, moduleEvidence, module.name));
          return validateRepositoryMap(raw, new Set(module.files));
        } catch {
          return fallbackRepositoryMap(moduleEvidence.files.map((file) => ({ path: file.path, role: classifyFile(file.path) })));
        }
      }),
    );
    maps.push(...results);
  }
  return { map: mergeRepositoryMaps(maps, new Set(evidence.files.map((file) => file.path))), modulesAnalyzed: modules.length };
}

async function createRepositoryMap(
  input: AnalysisPipelineInput,
  evidence: RepositoryEvidence,
  deps: AnalysisPipelineDependencies,
): Promise<{ map: RepositoryMap; modulesAnalyzed: number }> {
  if (input.depth === "deep") return deepRepositoryMap(input, evidence, deps);
  try {
    const raw = await deps.requestJson<RepositoryMap>("repository_analysis", mapPrompt(input, evidence, input.depth));
    return { map: validateRepositoryMap(raw, new Set(evidence.files.map((file) => file.path))), modulesAnalyzed: 0 };
  } catch {
    return {
      map: fallbackRepositoryMap(evidence.files.map((file) => ({ path: file.path, role: classifyFile(file.path) }))),
      modulesAnalyzed: 0,
    };
  }
}

export async function runAnalysisPipeline(
  input: AnalysisPipelineInput,
  deps: AnalysisPipelineDependencies = defaultDependencies,
): Promise<AnalysisPipelineResult> {
  const id = parseRepositoryId(input.repository);
  const identity = createBriefIdentity(id.key, input.mode, input.depth, input.question);
  const evidence = await deps.collectEvidence(id, input.depth, input.mode, {
    include: input.include,
    exclude: input.exclude,
    question: input.question,
  });
  if (!evidence.files.length) throw new Error("NO_EVIDENCE: No readable repository evidence was found.");

  const stored = await deps.readBrief(identity, evidence.evidenceFingerprint);
  if (stored) {
    const analysis = stored.evidence_json.analysis as AnalysisMetadata | undefined;
    return {
      brief: stored.brief_markdown,
      source: "cache",
      mode: stored.analysis_mode ?? input.mode,
      depth: stored.analysis_depth ?? input.depth,
      evidence: stored.evidence_json,
      analysis: analysis ?? {
        pipeline: "single_pass",
        repositoryMapSource: "not_used",
        modulesAnalyzed: 0,
        evidenceFingerprint: stored.evidence_fingerprint ?? "legacy",
        quality: { passed: true, warnings: [], repaired: false },
      },
    };
  }

  let repositoryMap: RepositoryMap | null = null;
  let mapSource: AnalysisMetadata["repositoryMapSource"] = "not_used";
  let modulesAnalyzed = 0;
  if (input.depth !== "fast") {
    const cacheIdentity = analysisIdentity(input, evidence, identity.questionHash);
    repositoryMap = await deps.readAnalysis(cacheIdentity);
    if (repositoryMap) {
      mapSource = "cache";
    } else {
      const created = await createRepositoryMap(input, evidence, deps);
      repositoryMap = created.map;
      modulesAnalyzed = created.modulesAnalyzed;
      mapSource = "generated";
      await deps.saveAnalysis({ identity: cacheIdentity, repositoryMap, evidence: { files: evidence.files.map((file) => file.path) } });
    }
  }

  const initialBrief = await deps.requestText(
    "brief_writing",
    repositoryMap
      ? writerPrompt(input, evidence, repositoryMap)
      : buildBriefPrompt({ repositoryKey: id.key, mode: input.mode, depth: input.depth, question: input.question, ...evidence }),
  );
  const selectedPaths = evidence.files.map((file) => file.path);
  let brief = initialBrief;
  let quality = validateBriefQuality({ brief, mode: input.mode, depth: input.depth, selectedPaths });
  const repairAllowed = input.depth === "deep" ||
    ((input.depth === "balanced" || input.depth === "focused") &&
      quality.warnings.some((warning) => /heading|citation/iu.test(warning)));
  if (!quality.passed && repairAllowed) {
    try {
      brief = await deps.requestText("brief_repair", repairPrompt(brief, quality.warnings, selectedPaths));
      quality = validateBriefQuality({ brief, mode: input.mode, depth: input.depth, selectedPaths, repaired: true });
    } catch {
      quality = { ...quality, warnings: [...quality.warnings, "Brief repair failed."], repaired: false };
    }
  }
  const analysis: AnalysisMetadata = {
    pipeline: input.depth === "fast" ? "single_pass" : input.depth === "deep" ? "module_map" : "repository_map",
    repositoryMapSource: mapSource,
    modulesAnalyzed,
    evidenceFingerprint: evidence.evidenceFingerprint,
    quality,
  };
  const storedEvidence = responseEvidence(evidence, analysis);
  await deps.saveBrief({
    identity,
    title: id.key,
    brief,
    evidence: storedEvidence,
    evidenceFingerprint: evidence.evidenceFingerprint,
  });
  return { brief, source: "generated", mode: input.mode, depth: input.depth, evidence: storedEvidence, analysis };
}
