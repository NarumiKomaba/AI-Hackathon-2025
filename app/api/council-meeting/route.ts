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
import { selectMembers, normalizeSpeakerId, ALL_MEMBERS, COUNCIL_MATRIX_PROMPT } from "../council/config";

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

    // Dynamic Member Selection
    const activeMembers = selectMembers(topic || "", history || []);
    const activeMemberIds = activeMembers.map(m => m.id).join(", ");

    // 履歴：人間味のある名前を維持してAIに文脈を伝える
    const shortHistory = (history as any[])?.slice(-5).map(h => {
      const name = h.speakerId === "user" ? "勇者" : ALL_MEMBERS.find(m => m.id === h.speakerId)?.name || "不明";
      return `${name}: ${h.message}`;
    }).join("\n") || "";

    // Detect if this is an "adoption" request
    const isAdoptionRequest = topic && (topic.includes("採用したい") || topic.includes("を採用"));

    const prompt = `
あなたはプロジェクト管理AI評議会。
今回の出席メンバーは【${activeMemberIds}】の4名だ。
役割とコア価値観になりきり、勇者（User）と議論して、最終的に現実的なアクションプランに収束させよ。

## 出席メンバー設定
${activeMembers.map(m => `
- **${m.name} (${m.id})**:
    - 性格: ${m.personality}
    - **【譲れないコア価値観 (NG)】**: ${m.coreValue} (NG行動: ${m.ng})
    - **【調整可能なスタンス】**: ${m.adjustable}
`).join("")}

${COUNCIL_MATRIX_PROMPT}

## 状況
Status: ${questTitle}(${status}) / Metrics: ${JSON.stringify(metrics)}
Data: ${contextText}
議題: "${topic || "現状分析"}"
履歴:
${shortHistory}

${isAdoptionRequest ? `
## 【特別指示】条件付き承認モード
勇者が案を採用しようとしている。各メンバーは以下のルールに従え：
1. **基本姿勢**: 案そのものは「条件付きで賛成」する。
2. **条件提示**: 自分のコア価値観を守るために**必須の条件を1つ**明確に提示せよ。
   - 例: PMO「品質テストの実施が条件だ」
   - 例: Manager「予算10%増枠が必要」
   - 例: SRE「負荷テストとモニタリング設定が前提」
3. **簡潔に**: 各メンバー1発言のみ。条件を明確に述べ、アクションプランに条件を含めよ。
4. **最後はSuper PM**: ギルドマスターが全員の条件をまとめ、「これらの条件を満たせば実行可能」と総括せよ。
` : `
## 動的調整ルール (Dynamic Adjustment)
1. **分析**: 勇者の発言が各メンバーの「NG行動」に触れていないか判定せよ。
2. **拒絶**: 「NG」に触れる場合、そのメンバーは断固拒否し、理由（コンプライアンス違反、技術的負債など）を述べよ。
3. **軟化**: 勇者が「調整可能」な領域で妥当な対案を出した場合、スタンスを「反対」から「条件付き賛成」へ変更せよ。
    - 例: PMO「品質担保が条件だが、そのツール導入なら認めよう」
4. **収束**: 議論が平行線の場合、誰かが「条件付きの合意」や「段階的な実行」を提案し、アクションに繋げよ。
`}

## 出力形式
JSON配列形式のみ。
[ {"speakerId":"...", "message":"...", "actionPlan":"..."} ]
${isAdoptionRequest ? "各メンバー1回ずつ + ギルドマスターの総括で構成せよ。" : "各メンバー1回ずつ、計2〜3回の発言で構成せよ。"}
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

    // 念のためのIDマッピング修正
    const normalized = (Array.isArray(parsed) ? parsed : []).map((m: any) => {
      return {
        speakerId: normalizeSpeakerId(m.speakerId || m.speaker_id || m.id || m.speaker || ""),
        message: m.message || m.content || m.text || "",
        actionPlan: m.actionPlan || m.action || m.plan || ""
      };
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
