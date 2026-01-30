import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";

// ----------------------------------------------------------------------
// Config & Helpers
// ----------------------------------------------------------------------
import { selectMembers, normalizeSpeakerId, COUNCIL_MATRIX_PROMPT } from "../council/config";

// ----------------------------------------------------------------------
// Firestore Admin Init (Shared Logic)
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

export async function POST(req: Request) {
    let rawText = "";
    try {
        const { projectId } = await req.json();
        const pid = projectId || "core-system"; // Default

        const project = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
        if (!project) throw new Error("GCP Project ID missing");

        const ai = new GoogleGenAI({ vertexai: true, project, location: "asia-northeast1" });
        const model = "gemini-2.5-flash";

        const db = initFirestoreAdmin();

        // Fetch Project Status to get the Report
        const snap = await db.collection("project_status").where("project_id", "==", pid).limit(1).get();
        let docData: FirebaseFirestore.DocumentData | undefined;

        if (!snap.empty) {
            docData = snap.docs[0].data();
        } else {
            // Fallback: Check 'projectId' field just in case
            const snap2 = await db.collection("project_status").where("projectId", "==", pid).limit(1).get();
            if (!snap2.empty) docData = snap2.docs[0].data();
        }

        const reportData = (docData?.progress_report || docData?.project_report || docData?.project_status || docData?.status);

        if (!reportData) {
            return NextResponse.json({
                discussion: [{
                    speakerId: "super_pm",
                    message: "報告書データが見つからなかったようじゃな...（project_statusコレクションのprogress_reportフィールドを確認せよ）"
                }],
                qa: []
            });
        }

        const reportText = typeof reportData === 'string' ? reportData : JSON.stringify(reportData, null, 2);

        // Dynamic Member Selection based on Report Content
        const activeMembers = selectMembers(reportText, []);
        const activeMemberIds = activeMembers.map(m => m.id).join(", ");

        const prompt = `
あなたはプロジェクト管理AI評議会。
今回の出席メンバーは【${activeMemberIds}】の4名だ。
報告書を読み込み、役割とコア価値観になりきり議論せよ。
さらに、鋭い「想定質問」と「回答例」を生成せよ。

## 出席メンバー設定
${activeMembers.map(m => `
- **${m.name} (${m.id})**:
    - 性格: ${m.personality}
    - **【譲れないコア価値観 (NG)】**: ${m.coreValue} (NG行動: ${m.ng})
    - **【調整可能なスタンス】**: ${m.adjustable}
`).join("")}

${COUNCIL_MATRIX_PROMPT}

報告書データ:
${reportText.slice(0, 10000)}

## 成果物
出力は以下のJSON形式のみで返却せよ。Markdownブロックは不要。

{
  "discussion": [
    { "speakerId": "...", "message": "...", "actionPlan": "..." },
    { "speakerId": "...", "message": "...", "actionPlan": "..." }
  ],
  "qa": [
    { "question": "...", "answer": "...", "askedBy": "役員A" },
    { "question": "...", "answer": "...", "askedBy": "事業部長" }
  ]
}

## ルール
1. **議論**: 報告書の甘い点、リスク、成果を指摘し合え。各メンバー2発言程度。メンバーIDは必ず正しく使え。
2. **想定質問**: 報告書の不備や、ビジネス上のインパクトを突く鋭い質問を3つ作成せよ。
3. **アクションプラン**: 各議論の発言に対し、その発言内容を1行（30文字程度）で要約した具体的な実行アクション案「actionPlan」を必ず添えよ。
4. **JSONのみ**: 余計な前置きは一切不要。
`.trim();

        const result = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                thinkingConfig: { thinkingBudget: 0 },
                maxOutputTokens: 4000,
                responseMimeType: "application/json"
            },
        });

        // ... (Response handling below is mostly same, just updating normalization)

        try {
            const res = await (result as any).response;
            rawText = res.text();
        } catch (e) {
            const altRes = result as any;
            rawText = (altRes.candidates || altRes.response?.candidates)?.[0]?.content?.parts?.[0]?.text || "";
        }

        if (!rawText) throw new Error("API出力が空です");

        const repairJson = (str: string) => {
            let cleaned = str.trim();
            // Remove markdown code blocks again just to be safe
            cleaned = cleaned.replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "");

            const start = cleaned.indexOf("{");
            const end = cleaned.lastIndexOf("}");
            if (start !== -1 && end !== -1) {
                return cleaned.substring(start, end + 1);
            }
            return cleaned;
        };

        const parsed = JSON.parse(repairJson(rawText));

        // Use shared normalization
        const normalizedDiscussion = (Array.isArray(parsed.discussion) ? parsed.discussion : []).map((m: any) => {
            return {
                speakerId: normalizeSpeakerId(m.speakerId || m.speaker_id || m.id || m.speaker || ""),
                message: m.message || m.content || m.text || "",
                actionPlan: m.actionPlan || m.action || m.plan || ""
            };
        });

        return NextResponse.json({
            discussion: normalizedDiscussion,
            qa: Array.isArray(parsed.qa) ? parsed.qa : []
        });

    } catch (err: any) {
        console.error("Council Report API Error:", err);
        return NextResponse.json({
            discussion: [{
                speakerId: "super_pm",
                message: `解析中にエラーが発生したようだ...: ${err.message}`
            }],
            qa: []
        });
    }
}
