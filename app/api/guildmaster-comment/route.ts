import { NextResponse } from "next/server";
import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";
import { VertexAI } from "@google-cloud/vertexai";

export const runtime = "nodejs";

/* ================================
   Firestore Admin init
================================ */
function initFirestoreAdmin(): FirebaseFirestore.Firestore {
  if (admin.apps.length) return admin.firestore();

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set");

  const abs = path.isAbsolute(credPath) ? credPath : path.join(process.cwd(), credPath);
  if (!fs.existsSync(abs)) throw new Error(`service account json not found: ${abs}`);

  const serviceAccount = JSON.parse(fs.readFileSync(abs, "utf-8")) as Record<string, unknown>;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });

  return admin.firestore();
}

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
   Types
================================ */
type SummaryObject = Record<string, unknown>;

type ProjectStatusDoc = {
  projectId?: string;
  project_id?: string;
  summary?: SummaryObject;
  updatedAt?: unknown;
  createdAt?: unknown;
};

type GuildMasterMood = "smile" | "normal" | "strict";

type ResBody = {
  projectId: string;
  comment: string;
  mood: GuildMasterMood;
};

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

/* ================================
   Firestore: fetch latest project_status by projectId
================================ */
async function fetchLatestProjectStatusByEitherKey(
  db: FirebaseFirestore.Firestore,
  projectId: string
): Promise<ProjectStatusDoc | null> {
  // 1) project_id
  const s1 = await db
    .collection("project_status")
    .where("project_id", "==", projectId)
    .orderBy("updatedAt", "desc")
    .limit(1)
    .get()
    .catch(async () => {
      const snap = await db.collection("project_status").where("project_id", "==", projectId).limit(1).get();
      return snap;
    });

  if (!s1.empty) return s1.docs[0].data() as ProjectStatusDoc;

  // 2) projectId
  const s2 = await db
    .collection("project_status")
    .where("projectId", "==", projectId)
    .orderBy("updatedAt", "desc")
    .limit(1)
    .get()
    .catch(async () => {
      const snap = await db.collection("project_status").where("projectId", "==", projectId).limit(1).get();
      return snap;
    });

  if (!s2.empty) return s2.docs[0].data() as ProjectStatusDoc;

  // 3) docId = projectId の運用の場合
  const doc = await db.collection("project_status").doc(projectId).get();
  if (doc.exists) return doc.data() as ProjectStatusDoc;

  return null;
}

/* ================================
   Summary helpers
================================ */
function normalizeSummarySection(v: unknown): string {
  if (v === null || v === undefined) return "(なし)";
  if (typeof v === "string") return v.trim() || "(なし)";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function extractFourSummaries(summary: SummaryObject | undefined): {
  wbs: string;
  task: string;
  chat: string;
  cost: string;
} {
  const wbs = normalizeSummarySection(summary?.wbs);
  const task = normalizeSummarySection(summary?.task);
  const chat = normalizeSummarySection(summary?.chat);
  const cost = normalizeSummarySection(summary?.cost);
  return { wbs, task, chat, cost };
}

function buildFourSummaryText(summary: SummaryObject | undefined): string {
  const { wbs, task, chat, cost } = extractFourSummaries(summary);
  return [
    `[wbs]\n${wbs}`,
    `[task]\n${task}`,
    `[chat]\n${chat}`,
    `[cost]\n${cost}`,
  ].join("\n\n");
}

/* ================================
   Decide mood (deterministic)
================================ */
function decideGuildMasterMood(summaryText: string): GuildMasterMood {
  const s = summaryText;

  const strictHints = [
    "期限切れ",
    "遅延",
    "ブロック",
    "停滞",
    "リスク",
    "手戻り",
    "超過",
    "滞留",
    "未完了",
    "炎上",
    "障害",
    "不具合",
    "赤字",
  ];

  const smileHints = ["順調", "回復", "完了", "達成", "問題なし", "前進", "改善"];

  const hasStrict = strictHints.some((k) => s.includes(k));
  const hasSmile = smileHints.some((k) => s.includes(k));

  if (hasStrict) return "strict";
  if (hasSmile) return "smile";
  return "normal";
}

/* ================================
   Prompt (wbs/task/chat/cost ONLY)
================================ */
function buildGuildMasterPrompt(params: {
  projectId: string;
  fourSummaryText: string;
}): string {
  const { projectId, fourSummaryText } = params;

  return `
# あなたの役割
あなたは幾多のデスマーチを生き延びてきた大規模システム開発の「伝説の老賢者（熟練PMO）」です。
4つの異なる視点（WBS、課題、チーム、採算）からの現状報告を総合的に評価し、PMに対して「今、最も優先すべきアクション」を1つだけ予言（助言）してください。

# 入力データの説明
以下4つの要約テキストが与えられます（project_status.summary）。
1. wbs: スケジュール進捗の要約
2. task: 課題・バグの要約
3. chat: チームの雰囲気・リスク予兆の要約
4. cost: 採算・コストの要約

# 依頼内容
4つの情報を等しいウェイトで評価した上で、プロジェクト全体として最大のリスク（諸悪の根源）を特定し、PMへの助言を作成してください。

## 判断ロジックの指針
- 連鎖の特定: 「チャットの不満」→「バグ多発」→「進捗遅延」→「コスト超過」のような因果関係を見抜くこと。
- 根本原因への対処: 表面的な事象（遅れ）ではなく、その真因（仕様未決、リソース不足、レビュー不全等）に対するアクションを優先すること。
- トレードオフの提示: 品質、納期、コストのうち“何を守るべきか”が分かる一言を含めること（ただし助言はアクション1つのみ）。

# 出力フォーマット（厳守）
- 文字数: 全角60文字〜80文字（最大2行）
- 構成: 「[根本原因]が最大のリスクじゃ。[アクション]を最優先で実行するのじゃ。」を基本とする
- アクションは1つだけ（複数案・箇条書き禁止）
- トーン: 年老いた予言者、賢者風（「～～のじゃ」「～～するでないぞ」「～～がよい」など）。厳しくも愛のある口調で。
- 根拠: 入力中の数値・件数・期限・担当・固有名詞などを最低1つ、文中に織り込むこと
- 不明点が多い場合: 「オーナーを確定せよ」をアクションにしてよい

# 入力
projectId: ${projectId}

[project_status.summary]
${fourSummaryText}

# 注意
出力は助言文のみ。前置き・解説・引用・装飾は一切不要。
`.trim();
}

/* ================================
   Vertex generate
================================ */
async function generateGuildMasterComment(prompt: string): Promise<string> {
  const vertex = getVertex();
  const model = vertex.getGenerativeModel({ model: "gemini-2.5-flash" });

  const run = async (p: string, maxOut: number) => {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: p }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: maxOut,

        // ★ 重要：2.5 Flash の thinking を無効化
        thinkingConfig: { thinkingBudget: 0 },
      } as any,
    });

    const cand = result.response.candidates?.[0];
    const parts = cand?.content?.parts ?? [];

    // ★ parts を全部連結して text を回収（1個目決め打ちはやめる）
    const text = parts
      .map((pt: any) => (typeof pt?.text === "string" ? pt.text : ""))
      .join("")
      .trim();

    return text;
  };

  // 1st try
  const first = await run(prompt, 256);
  if (first) return first;

  // ★ 空のときだけ 1回リトライ（可視文字を強制）
  const retryPrompt =
    prompt +
    "\n\n# 追加制約（厳守）\n- 出力は必ず日本語の可視文字を含める（空白のみ禁止）\n- 形式「〜のじゃ。〜するのじゃ。」を守る\n";
  const second = await run(retryPrompt, 512);
  return second.trim();
}


/* ================================
   Optional: strict post-check (light)
   - 60〜80全角目安はLLMに守らせるが、空や長すぎだけ保険
================================ */
function fallbackComment(summaryText: string): string {
  const mood = decideGuildMasterMood(summaryText);
  if (mood === "strict") {
    return "仕様と優先度の未確定が最大のリスクじゃ。決裁者を確定し、48時間で優先度を凍結するのじゃ。";
  }
  return "情報の欠落が最大のリスクじゃ。wbs/task/chat/costの要約責任者を確定するのじゃ。";
}

/* ================================
   Route
================================ */
export async function POST(): Promise<Response> {
  try {
    const projectId = "dummy_projectId"; // ★必要なら body から受け取る
    const db = initFirestoreAdmin();

    const statusDoc = await fetchLatestProjectStatusByEitherKey(db, projectId);

    // ★入力は project_status.summary の4要約のみ
    const fourSummaryText = buildFourSummaryText(statusDoc?.summary);

    const prompt = buildGuildMasterPrompt({ projectId, fourSummaryText });
    const comment = await generateGuildMasterComment(prompt);

    // ★ 表情は API 側で決定的に判定（LLMに任せない）
    const mood = decideGuildMasterMood(fourSummaryText);

    const res: ResBody = {
      projectId,
      comment: comment || fallbackComment(fourSummaryText),
      mood,
    };

    return NextResponse.json(res);
  } catch (e: unknown) {
    console.error("❌ guildmaster-comment failed:", e);
    return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
  }
}
