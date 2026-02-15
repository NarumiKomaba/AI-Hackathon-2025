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

async function fetchProjectName(projectId: string): Promise<string> {
  // testProjects コレクションからプロジェクト名を取得
  const snap = await adminDb
    .collection("testProjects")
    .where("project_id", "==", projectId)
    .limit(1)
    .get();

  if (!snap.empty) {
    const data = snap.docs[0].data();
    return data.name || data.title || projectId;
  }

  const snap2 = await adminDb
    .collection("testProjects")
    .where("projectId", "==", projectId)
    .limit(1)
    .get();

  if (!snap2.empty) {
    const data = snap2.docs[0].data();
    return data.name || data.title || projectId;
  }

  return projectId;
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
function buildCharacterStatusPrompt(params: {
  projectId: string;
  projectName: string;
  wbsText: string;
  issueText: string;
}) {
  const { projectId, projectName, wbsText, issueText } = params;

  return `
# 命令
あなたは大規模システム開発プロジェクトをRPG風に表現するクリエイティブなAIです。
以下の[入力データ]を分析し、プロジェクトメンバーの「RPGキャラクターステータス」を生成してください。

出力は必ず**指定されたJSON形式のみ**を出力してください。

# 入力データ
プロジェクトID: ${projectId}
プロジェクト名: ${projectName}

[WBSデータ（タスク・担当・進捗）]:
${wbsText}

[課題管理データ（Redmine/Issue）]:
${issueText}

# 生成ルール

## 名前・称号
- name: "駒場（あなた）" で固定
- title: プロジェクトの状況に応じた二つ名（例：「進捗の守護者」「デスマーチの生還者」「要件定義の賢者」など）

## レベル・経験値
- level: WBSの完了タスク数や課題解決数に基づいて 1〜99 で算出。完了率が高いほど高レベル
- exp / expMax: 次のレベルまでの経験値。現在進行中タスクの割合で算出

## メインロール
- mainRole: WBSの担当タスクの傾向から推定（例: "PM / 設計リード", "フルスタック開発者", "テストエンジニア"）

## 現在のクエスト
- currentQuest: "${projectName}" に "編" を付けてRPG風に（例: "${projectName} 編"）

## 装備（実際のプロジェクト状況をRPGアイテム風に表現）
- weapon: 主に使っているツールや手法をRPG武器風に（例: "要件定義の古文書", "自動テストの魔剣", "Excelマクロの聖槍"）
- armor: 防御的な取り組みをRPG防具風に（例: "コードレビューの鎧", "議事録自動化の鎧"）
- accessory: 補助的なスキルやツールをアクセサリ風に（例: "CI/CDの魔石", "Slackの伝書鳩"）
- cloak: プロジェクトの課題や苦労をマント風に（例: "残業のマント（できれば脱ぎたい）", "技術的負債のマント"）

## ステータス値（各1〜99）
- hp: プロジェクトの体力（残り工数や余裕度）
- agi: 対応スピード（課題解決の速さ）
- atk: 推進力（タスク完了の速度）
- def: 守備力（品質管理、テストカバレッジなど）
- weak: 弱点値（遅延リスクや未解決課題の多さ）

## スキル（3〜5個）
- WBSのタスク種別や課題カテゴリから、プロジェクトで培ったスキルを抽出
- 各スキルの exp (1〜10) と max (10固定) を設定
- rank: exp に応じて "見習い"(1-3), "中級者"(4-6), "熟練者"(7-9), "達人"(10)
- key: スキルの英語キー（例: "pm", "frontend", "testing"）
- label: スキルの日本語名（例: "PM", "フロントエンド", "テスト"）

# 出力フォーマット（JSON厳守）
JSON以外は一切出力しないでください。

{
  "name": "駒場（あなた）",
  "title": "二つ名",
  "level": 12,
  "exp": 128,
  "expMax": 200,
  "mainRole": "PM / PoC 推進",
  "currentQuest": "基幹システム刷新 編",
  "equipment": {
    "weapon": "武器名",
    "armor": "防具名",
    "accessory": "アクセサリ名",
    "cloak": "マント名"
  },
  "baseStats": {
    "hp": 57,
    "agi": 13,
    "atk": 34,
    "def": 39,
    "weak": 31
  },
  "skills": [
    { "key": "pm", "label": "PM", "exp": 8, "max": 10, "rank": "熟練者" }
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

async function generateCharacterStatus(prompt: string): Promise<string> {
  const vertex = getVertex();
  const model = vertex.getGenerativeModel({ model: "gemini-2.5-flash" });

  const req: VertexGenerateContentRequest = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  try {
    const resultUnknown: unknown = await model.generateContent(req);
    const result = resultUnknown as VertexResponseShape;

    const cand = result.response.candidates?.[0];
    const parts = cand?.content?.parts ?? [];
    const text = parts.map(partText).join("").trim();

    return text;
  } catch (e) {
    console.error("Vertex AI Generation Error:", e);
    throw e;
  }
}

/* ================================
   Fallback status (used when AI generation fails or no data)
================================ */
function getFallbackStatus(projectName: string) {
  return {
    name: "駒場（あなた）",
    title: "プロジェクトの勇者",
    level: 1,
    exp: 0,
    expMax: 100,
    mainRole: "冒険者（未設定）",
    currentQuest: projectName ? `${projectName} 編` : "新たなる冒険",
    equipment: {
      weapon: "素手（まだ装備がない）",
      armor: "旅人の服",
      accessory: "なし",
      cloak: "風のマント",
    },
    baseStats: { hp: 10, agi: 10, atk: 10, def: 10, weak: 10 },
    skills: [
      { key: "beginner", label: "冒険者", exp: 1, max: 10, rank: "見習い" },
    ],
  };
}

/* ================================
   Route
================================ */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      projectId?: string;
    };
    const projectId = body.projectId || "core-system";

    // Firestore からデータ取得
    const [wbsItems, issueItems, projectName] = await Promise.all([
      fetchByProjectEitherKey("wbs_items", projectId, 300),
      fetchByProjectEitherKey("issue_items", projectId, 300),
      fetchProjectName(projectId),
    ]);

    // データが全くない場合はフォールバック
    if (wbsItems.length === 0 && issueItems.length === 0) {
      return NextResponse.json({
        projectId,
        status: getFallbackStatus(projectName),
        source: "fallback",
      });
    }

    const prompt = buildCharacterStatusPrompt({
      projectId,
      projectName,
      wbsText: toSummaryLines(wbsItems, "WBS"),
      issueText: toSummaryLines(issueItems, "ISSUE"),
    });

    let status;
    try {
      const rawText = await generateCharacterStatus(prompt);
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("JSON not found in AI response");
      }
      status = JSON.parse(jsonMatch[0]);
    } catch (aiError) {
      console.warn("Falling back to default status due to AI error:", aiError);
      status = getFallbackStatus(projectName);
    }

    return NextResponse.json({
      projectId,
      status,
      source: status.name === "駒場（あなた）" && status.level === 1 ? "fallback" : "ai",
    });
  } catch (e: unknown) {
    console.error("character-status route absolute error:", e);
    // ここまで来ちゃった場合も、最低限エラーレスポンスは維持
    return NextResponse.json(
      { error: "Fatal error in status generation" },
      { status: 500 }
    );
  }
}
