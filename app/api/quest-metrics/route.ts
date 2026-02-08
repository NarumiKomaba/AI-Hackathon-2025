import { NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/* ================================
   Vertex init
================================ */
function getVertex(): VertexAI {
  const project = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION;
  if (!project) throw new Error("GCP_PROJECT_ID is not set");
  if (!location) throw new Error("GCP_LOCATION is not set");
  return new VertexAI({ project, location });
}

/* ================================
   Firestore helpers
================================ */
async function fetchByProjectEitherKey(
  collectionName: string,
  projectId: string,
  limit = 500
) {
  const snap1 = await adminDb
    .collection(collectionName)
    .where("project_id", "==", projectId)
    .limit(limit)
    .get();

  if (!snap1.empty) {
    return snap1.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  const snap2 = await adminDb
    .collection(collectionName)
    .where("projectId", "==", projectId)
    .limit(limit)
    .get();

  return snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function toSummaryLines(arr: unknown[], label: string, max = 100): string {
  const sliced = arr.slice(0, max);
  if (sliced.length === 0) return `${label}: (0件)`;
  return [
    `${label}: (${sliced.length}件)`,
    ...sliced.map((x) => JSON.stringify(x)),
  ].join("\n");
}

/* ================================
   Prompt
================================ */
function buildQuestMetricsPrompt(params: {
  projectId: string;
  questTitle: string;
  wbsText: string;
  issueText: string;
}) {
  const { projectId, questTitle, wbsText, issueText } = params;

  return `
# 命令
あなたはプロジェクト管理をRPG風に表現するクリエイティブなAIです。
以下の[入力データ]を分析し、クエスト（プロジェクト）の「進行状況メトリクス」と「状態異常（デバフ）」を生成してください。

出力は必ず**指定されたJSON形式のみ**を出力してください。

# 入力データ
プロジェクトID: ${projectId}
クエスト名: ${questTitle}

[WBSデータ（タスク・担当・進捗）]:
${wbsText}

[課題管理データ（Issue）]:
${issueText}

# 生成ルール

## メトリクス（3つ固定）
以下3つの指標を0〜100のパーセンテージで算出してください:

1. **AGI（進捗）**: WBSタスクの完了率を元に算出。完了タスク数/全タスク数の比率をベースに
2. **HP（コスト）**: プロジェクトの健全度。課題の深刻度や遅延タスクの割合からHP消費を推定
3. **EXP（タスク）**: タスク消化の蓄積度。進行中・完了タスクの工数的な蓄積を推定

## デバフ（状態異常）
プロジェクトが抱えている問題をRPG風の状態異常として0〜5個生成:
- 実際の課題やリスクに基づくこと
- RPG風の名前と括弧内に実態を書くこと
- 例: "会議地獄（集中力低下）", "要件モヤモヤ（視界不良）", "GPU熱暴走", "ポリシー迷宮", "夜間緊急依頼（呪い）", "技術的負債（毒）", "仕様変更の嵐（混乱）"
- 問題がなければ空配列

# 出力フォーマット（JSON厳守）
JSON以外は一切出力しないでください。

{
  "metrics": [
    { "label": "AGI（進捗）", "key": "agi", "value": 65 },
    { "label": "HP（コスト）", "key": "hp", "value": 45 },
    { "label": "EXP（タスク）", "key": "exp", "value": 40 }
  ],
  "debuffs": [
    { "id": "debuff-id", "label": "状態異常名（説明）" }
  ]
}
`.trim();
}

/* ================================
   Vertex generate
================================ */
type ThinkingConfig = { thinkingBudget: number };

type VertexGenerateContentRequest = {
  contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }>;
  generationConfig: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    thinkingConfig?: ThinkingConfig;
  };
};

type VertexCandidate = {
  content?: {
    parts?: Array<unknown>;
  };
};

type VertexResponseShape = {
  response: {
    candidates?: VertexCandidate[];
  };
};

function partText(p: unknown): string {
  if (typeof p !== "object" || p === null) return "";
  const o = p as Record<string, unknown>;
  const t = o.text;
  return typeof t === "string" ? t : "";
}

async function generateQuestMetrics(prompt: string): Promise<string> {
  const vertex = getVertex();
  const model = vertex.getGenerativeModel({ model: "gemini-2.5-flash" });

  const req: VertexGenerateContentRequest = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.5,
      topP: 0.9,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const resultUnknown: unknown = await model.generateContent(req);
  const result = resultUnknown as VertexResponseShape;

  const cand = result.response.candidates?.[0];
  const parts = cand?.content?.parts ?? [];
  return parts.map(partText).join("").trim();
}

/* ================================
   Fallback
================================ */
function getFallbackMetrics() {
  return {
    metrics: [
      { label: "AGI（進捗）", key: "agi", value: 0 },
      { label: "HP（コスト）", key: "hp", value: 0 },
      { label: "EXP（タスク）", key: "exp", value: 0 },
    ],
    debuffs: [],
  };
}

/* ================================
   Route
================================ */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      projectId?: string;
      questTitle?: string;
    };
    const projectId = body.projectId || "core-system";
    const questTitle = body.questTitle || projectId;

    // Firestore からデータ取得
    const [wbsItems, issueItems] = await Promise.all([
      fetchByProjectEitherKey("wbs_items", projectId, 300),
      fetchByProjectEitherKey("issue_items", projectId, 300),
    ]);

    // データが全くない場合はフォールバック
    if (wbsItems.length === 0 && issueItems.length === 0) {
      return NextResponse.json({
        projectId,
        ...getFallbackMetrics(),
        source: "fallback",
      });
    }

    const prompt = buildQuestMetricsPrompt({
      projectId,
      questTitle,
      wbsText: toSummaryLines(wbsItems, "WBS"),
      issueText: toSummaryLines(issueItems, "ISSUE"),
    });

    const rawText = await generateQuestMetrics(prompt);

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("quest-metrics: JSON extraction failed, raw:", rawText);
      return NextResponse.json({
        projectId,
        ...getFallbackMetrics(),
        source: "fallback",
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      projectId,
      metrics: parsed.metrics,
      debuffs: parsed.debuffs,
      source: "ai",
    });
  } catch (e: unknown) {
    console.error("quest-metrics error:", e);
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
