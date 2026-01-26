import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";

// ----------------------------------------------------------------------
// Firestore Admin Init
// ----------------------------------------------------------------------
function initFirestoreAdmin(): FirebaseFirestore.Firestore {
  if (admin.apps.length) return admin.firestore();
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set");
  const abs = path.isAbsolute(credPath) ? credPath : path.join(process.cwd(), credPath);
  const serviceAccount = JSON.parse(fs.readFileSync(abs, "utf-8"));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin.firestore();
}

// ----------------------------------------------------------------------
// Config & Helpers
// ----------------------------------------------------------------------
const MEMBERS = [
  { id: "pmo", name: "機律 厳 (PMO)", personality: "規律とリスク管理を絶対視。遅延に厳しく悲観的。" },
  { id: "sales", name: "調子 良い子 (Sales)", personality: "ノリの良い営業。顧客満足度優先で現場負荷無視。" },
  { id: "manager", name: "板挟 課長 (Manager)", personality: "気弱な管理職。予算超過と上層部の評判を恐れる。" },
  { id: "super_pm", name: "ギルドマスター (Super PM)", personality: "伝説のPM。議論を整理し、勇者へ『材料と予測』を提示する議長。" },
];

async function fetchByProjectEitherKey(db: FirebaseFirestore.Firestore, collection: string, projectId: string) {
  const snap = await db.collection(collection).where("project_id", "==", projectId).limit(10).get();
  if (!snap.empty) return snap.docs.map(d => d.data());
  const snap2 = await db.collection(collection).where("projectId", "==", projectId).limit(10).get();
  return snap2.docs.map(d => d.data());
}

function toFastLines(items: any[], label: string) {
  const critical = items.filter(i => i.status === "遅延" || i.status === "未着手" || (i.progress_ratio !== undefined && i.progress_ratio < 100)).slice(0, 5);
  if (critical.length === 0) return "";
  return `${label}: ${critical.map(i => `${i.feature || i.title}(担:${i.assignee || '未選択'})`).join(", ")}`;
}

// ----------------------------------------------------------------------
// Main API
// ----------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const { questTitle, status, metrics, topic, history } = await req.json();
    const project = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    if (!project) throw new Error("GCP Project ID missing");

    const ai = new GoogleGenAI({ vertexai: true, project, location: "asia-northeast1" });
    const model = "gemini-2.5-flash";

    const db = initFirestoreAdmin();
    const projectId = "core-system"; // 固定化
    const [wbs, issue, profit] = await Promise.all([
      fetchByProjectEitherKey(db, "wbs_items", projectId),
      fetchByProjectEitherKey(db, "issue_items", projectId),
      fetchByProjectEitherKey(db, "profit_items", projectId),
    ]);

    const contextText = [toFastLines(wbs, "WBS重点"), toFastLines(issue, "課題"), toFastLines(profit, "予算")].filter(Boolean).join("\n");

    // 履歴：人間味のある名前を維持してAIに文脈を伝える（ここを削除しすぎていた）
    const shortHistory = (history as any[])?.slice(-3).map(h => {
      const name = h.speakerId === "user" ? "勇者" : MEMBERS.find(m => m.id === h.speakerId)?.name || "不明";
      return `${name}: ${h.message}`;
    }).join("\n") || "";

    const prompt = `
あなたはプロジェクト管理AI。4人のキャラになりきり爆速で議論せよ。
キャラ設定:
${MEMBERS.map(m => `- ${m.id}: ${m.name} (${m.personality})`).join("\n")}

状況: ${questTitle}(${status}) / Metrics: ${JSON.stringify(metrics)}
Data: ${contextText}
議題: "${topic || "現状分析"}"
履歴: ${shortHistory}

## ルール
1. **写像**: Data内の具体的タスク名や数値を必ず引用せよ。
2. **限界突破**: 深刻な遅延時には、予算や倫理を度外視した「極端な解消案」を必ず1つ含めよ。
3. **NOイエスマン**: 全員、勇者の案に対し代償を突きつけ、独自の視点で代案を出せ。
4. 出力は必ず以下のJSON配列形式のみ。speakerIdは必ず pmo, sales, manager, super_pm のいずれかを使用せよ。
[ {"speakerId":"...", "message":"..."} ]
`.trim();

    const result = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 2000,
        responseMimeType: "application/json"
      },
    });

    let rawText = "";
    try {
      const res = await (result as any).response;
      rawText = res.text();
    } catch (e) {
      const altRes = result as any;
      rawText = (altRes.candidates || altRes.response?.candidates)?.[0]?.content?.parts?.[0]?.text || "";
    }

    if (!rawText) throw new Error("API出力が空です");

    // 不完全なJSON（途中で切れた場合）を強引に修復する
    const repairJson = (str: string) => {
      let cleaned = str.trim();
      if (!cleaned.startsWith("[")) {
        const start = cleaned.indexOf("[");
        if (start !== -1) cleaned = cleaned.substring(start);
      }
      // 引用符、括弧の数を数えて足りない分を補完
      const quoteCount = (cleaned.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) cleaned += '"';
      const openBraces = (cleaned.match(/\{/g) || []).length;
      const closeBraces = (cleaned.match(/\}/g) || []).length;
      for (let i = 0; i < openBraces - closeBraces; i++) cleaned += '}';
      const openBrackets = (cleaned.match(/\[/g) || []).length;
      const closeBrackets = (cleaned.match(/\]/g) || []).length;
      for (let i = 0; i < openBrackets - closeBrackets; i++) cleaned += ']';
      return cleaned;
    };

    const repaired = repairJson(rawText);
    const jsonMatch = repaired.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : repaired);

    // 念のためのIDマッピング修正（AIがIDを間違えても救い出す）
    const normalized = (Array.isArray(parsed) ? parsed : []).map((m: any) => {
      const rid = String(m.speakerId || m.speaker_id || m.id || m.speaker || "").toLowerCase();
      let sid = "super_pm";
      if (rid.includes("pmo") || rid.includes("機律")) sid = "pmo";
      else if (rid.includes("manager") || rid.includes("課長") || rid.includes("板挟")) sid = "manager";
      else if (rid.includes("sales") || rid.includes("営業") || rid.includes("調子")) sid = "sales";
      return { speakerId: sid, message: m.message || m.content || m.text || "" };
    });

    return NextResponse.json(normalized);

  } catch (err: any) {
    console.error("Council API Error:", err);
    return NextResponse.json([{
      speakerId: "super_pm",
      message: `通信障害により評議会が中断された... 詳細: ${err.message}`
    }]);
  }
}
