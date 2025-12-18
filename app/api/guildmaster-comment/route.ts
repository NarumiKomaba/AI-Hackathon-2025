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

  const abs = path.isAbsolute(credPath)
    ? credPath
    : path.join(process.cwd(), credPath);
  if (!fs.existsSync(abs)) throw new Error(`service account json not found: ${abs}`);

  const serviceAccount = JSON.parse(
    fs.readFileSync(abs, "utf-8")
  ) as Record<string, unknown>;

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
      // updatedAt が無い場合に備えて orderByなしで拾う
      const snap = await db
        .collection("project_status")
        .where("project_id", "==", projectId)
        .limit(1)
        .get();
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
      const snap = await db
        .collection("project_status")
        .where("projectId", "==", projectId)
        .limit(1)
        .get();
      return snap;
    });

  if (!s2.empty) return s2.docs[0].data() as ProjectStatusDoc;

  // 3) もしかして docId = projectId の運用の場合
  const doc = await db.collection("project_status").doc(projectId).get();
  if (doc.exists) return doc.data() as ProjectStatusDoc;

  return null;
}

function summaryToText(summary: SummaryObject | undefined): string {
  if (!summary) return "summary: (なし)";

  // summary配下を“読みやすい塊”にする（値が文字列ならそのまま、オブジェクトならJSON）
  const lines: string[] = [];
  for (const [k, v] of Object.entries(summary)) {
    if (typeof v === "string") {
      lines.push(`[${k}]\n${v}`);
    } else {
      lines.push(`[${k}]\n${JSON.stringify(v)}`);
    }
  }
  return lines.join("\n\n");
}

/* ================================
   Decide mood (deterministic)
================================ */
function decideGuildMasterMood(summaryText: string): GuildMasterMood {
  const s = summaryText;

  // 強めの兆候（遅延・期限切れ・ブロック等）
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
  ];

  // 良い兆候（順調・回復・完了等）
  const smileHints = ["順調", "回復", "完了", "達成", "問題なし", "前進"];

  const hasStrict = strictHints.some((k) => s.includes(k));
  const hasSmile = smileHints.some((k) => s.includes(k));

  if (hasStrict) return "strict";
  if (hasSmile) return "smile";
  return "normal";
}

/* ================================
   Prompt (summary ONLY)
================================ */
function buildGuildMasterPrompt(params: {
  projectId: string;
  summaryText: string;
}): string {
  const { projectId, summaryText } = params;

  return `
# 命令
あなたは「Project Quest」のギルドマスター。
以下の[入力]（project_status.summaryのみ）を読み取り、プロジェクトメンバーに向けた「ギルドマスターの一言」を生成せよ。

# 出力要件（厳守）
- 日本語
- 2〜4文（長文禁止）
- 箇条書き禁止、絵文字禁止
- RPG口調だが、ビジネスに通じる具体アクションに落とす
- 「誰が／何を／いつまでに」を最低1つ含める（不明なら“オーナーを確定せよ”でよい）
- 入力の数値や固有名詞（例: 期限、担当、Issue例、遅延件数）を1つ以上根拠として触れる

# 入力
projectId: ${projectId}

[project_status.summary]
${summaryText}
`.trim();
}

/* ================================
   Vertex generate
================================ */
async function generateGuildMasterComment(prompt: string): Promise<string> {
  const vertex = getVertex();
  const model = vertex.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return String(text).trim();
}

/* ================================
   Route
================================ */
export async function POST(): Promise<Response> {
  try {
    const projectId = "dummy_projectId"; // ★固定（必要なら body から受け取る）
    const db = initFirestoreAdmin();

    const statusDoc = await fetchLatestProjectStatusByEitherKey(db, projectId);
    const summaryText = summaryToText(statusDoc?.summary);

    const prompt = buildGuildMasterPrompt({ projectId, summaryText });
    const comment = await generateGuildMasterComment(prompt);

    // ★ 表情は API 側で決定的に判定（LLMに任せない）
    const mood = decideGuildMasterMood(summaryText);

    const res: ResBody = {
      projectId,
      comment: comment || "…む。要約が薄いようじゃ。まずはsummaryを充実させるのだ。",
      mood,
    };

    return NextResponse.json(res);
  } catch (e: unknown) {
    console.error("❌ guildmaster-comment failed:", e);
    return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
  }
}
