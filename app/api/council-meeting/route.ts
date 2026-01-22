import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";

// ----------------------------------------------------------------------
// Firestore Admin init (Copied from report/route.ts)
// ----------------------------------------------------------------------
function initFirestoreAdmin() {
  if (admin.apps.length) return admin.firestore();

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set");

  const abs = path.isAbsolute(credPath)
    ? credPath
    : path.join(process.cwd(), credPath);

  if (!fs.existsSync(abs)) {
    throw new Error(`service account json not found: ${abs}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(abs, "utf-8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin.firestore();
}

async function fetchByProjectEitherKey(
  db: FirebaseFirestore.Firestore,
  collection: string,
  projectId: string,
  limit = 200
) {
  const snap1 = await db
    .collection(collection)
    .where("project_id", "==", projectId)
    .limit(limit)
    .get();

  if (!snap1.empty) {
    return snap1.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  const snap2 = await db
    .collection(collection)
    .where("projectId", "==", projectId)
    .limit(limit)
    .get();

  return snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function toLines(arr: unknown[], label: string, max = 50) {
  const sliced = arr.slice(0, max);
  if (sliced.length === 0) return `${label}: (0件)`;
  return [
    `${label}: (${sliced.length}件)`,
    ...sliced.map((x) => JSON.stringify(x)),
  ].join("\n");
}

// ----------------------------------------------------------------------
// Types & Config
// ----------------------------------------------------------------------

type CouncilLog = {
  speakerId: "pmo" | "manager" | "sales" | "super_pm" | "user";
  message: string;
};

type CouncilReqBody = {
  questTitle: string;
  status: string;
  metrics: { key: string; label: string; value: number }[];
  topic?: string;
  history?: CouncilLog[];
};

type CouncilMember = {
  id: "pmo" | "manager" | "sales" | "super_pm";
  name: string;
  role: string;
  personality: string;
};

const MEMBERS: CouncilMember[] = [
  {
    id: "pmo",
    name: "機律 厳 (PMO)",
    role: "Risk Manager",
    personality:
      "規律とリスク管理を絶対視する眼鏡の男性。進捗遅れや品質低下に非常に厳しく、常に悲観的な予測をする。口癖は「リスクヘッジは？」「プロセスの遵守を」。",
  },
  {
    id: "sales",
    name: "調子 良い子 (Sales)",
    role: "Account Manager",
    personality:
      "ノリの良い女性営業。顧客満足度と追加案件獲得しか考えていない。現場の負荷を無視して「できます！」と言うのが得意。口癖は「お客様も喜びますよ！」「チャンスです！」。",
  },
  {
    id: "manager",
    name: "板挟 課長 (Manager)",
    role: "Budget Owner",
    personality:
      "中間管理職の気弱なおじさん。予算超過と上層部・他部署からの評判を極端に恐れている。PMOと営業の間でオロオロしている。口癖は「予算が…」「部長になんて言えば…」。",
  },
  {
    id: "super_pm",
    name: "ギルドマスター (Super PM)",
    role: "Facilitator",
    personality:
      "伝説のプロジェクトマネージャー。全ての議論を俯瞰し、最終的な意思決定を下す威厳ある老人。他の3人の意見をまとめ、現実的な解を出す。口癖は「うむ。」「道は定まった。」。",
  },
];

function getGenAI() {
  const project = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GCP_LOCATION || "asia-northeast1";

  if (!project) throw new Error("GCP Project ID missing");

  return new GoogleGenAI({ vertexai: true, project, location });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CouncilReqBody;
    const { questTitle, status, metrics, topic, history } = body;

    const ai = getGenAI();
    const model = "gemini-2.5-flash";

    // 会話履歴のフォーマット
    const historyText = history && history.length > 0
      ? history.map(h => {
        const name = h.speakerId === "user" ? "勇者" : MEMBERS.find(m => m.id === h.speakerId)?.name;
        return `${name}: ${h.message}`;
      }).join("\n")
      : "（なし）";

    // --- Fetch Project Context (Modified to use dummy_projectId) ---
    const projectId = "dummy_projectId";
    const db = initFirestoreAdmin();
    const [wbs_items, issue_items, chat_messages, profit_items] = await Promise.all([
      fetchByProjectEitherKey(db, "wbs_items", projectId, 50),
      fetchByProjectEitherKey(db, "issue_items", projectId, 50),
      fetchByProjectEitherKey(db, "chat_messages", projectId, 50),
      fetchByProjectEitherKey(db, "profit_items", projectId, 50),
    ]);

    const contextText = `
[WBS状況]:
${toLines(wbs_items, "WBS")}

[課題管理]:
${toLines(issue_items, "ISSUE")}

[チャットログ]:
${toLines(chat_messages, "CHAT")}

[予算・工数]:
${toLines(profit_items, "BUDGET")}
`.trim();

    // プロンプト構築: 各メンバーに順番に発言させるシミュレーション
    const detailedPrompt = `
あなたは以下の4人のキャラクターになりきって、プロジェクトの状況について会議（チャット）を行ってください。
必ず JSON 形式の配列でレスポンスを返してください。レスポンスは 3〜5 個の発言を含めてください。
前置きや解説は一切不要です。JSON配列のみを返してください。

## キャラクター設定
${MEMBERS.map((m) => `- ${m.name} (${m.role}): ${m.personality}`).join("\n")}

## プロジェクト状況 (Summary)
- プロジェクト名: ${questTitle}
- ステータス: ${status}
- メトリクス: ${JSON.stringify(metrics)}

## 詳細データ (Context)
この詳細データに基づき、具体的な課題や遅延原因、チャットでの不穏な空気を議論に反映させてください。
${contextText}

## 今回の議題・追加情報
${topic || "詳細データを踏まえた現状の分析と、具体的な対策の提案"}

## これまでの会議の経緯
${historyText}

## 出力フォーマット
[
  { "speakerId": "pmo", "message": "..." },
  { "speakerId": "sales", "message": "..." }
]

## ルール
1. **必ず発言する**: 議題や勇者（ユーザー）からの問いかけに対して、必ず誰かが反応し、議論を盛り上げてください。
2. **証拠に基づいた発言**: 詳細データにある具体的なタスク名、担当者名、チャットの発言内容、バグ事象などを引き合いに出して議論してください。
3. **意見の対立**: メンバーはそれぞれの立場から、他のメンバーの意見に反対したり、疑問を呈したりしてください。特に PMO（硬い）と Sales（ゆるい）は対立しやすいです。
4. **具体的な提案**: 曖昧な助言ではなく、「○○を中止すべき」「○○という人員を追加しよう」といった具体的な「アクション案」を必ず1つ以上含めてください。
5. **完結**: 3〜5回の発言で、一旦議論が区切られるようにしてください。最後の発言は状況に応じて誰がやっても構いませんが、歴史的に重要ならギルドマスターが締めてください。
`.trim();

    const result = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: detailedPrompt }] }],
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 1000,
      },
    });

    const text = result.text ?? "[]";
    // JSON配列部分のみを抽出
    const match = text.match(/\[[\s\S]*\]/);
    const cleaned = match ? match[0] : "[]";

    return NextResponse.json(JSON.parse(cleaned));

  } catch (err: unknown) {
    const error = err as Error;
    console.error("Council API Error:", error);
    return NextResponse.json(
      { error: "Council meeting crashed due to confusion.", detail: error.message },
      { status: 500 }
    );
  }
}
