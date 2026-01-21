import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// ----------------------------------------------------------------------
// Types & Config
// ----------------------------------------------------------------------

type CouncilLog = {
  speakerId: "pmo" | "manager" | "sales" | "super_pm";
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
    name: "THE GUILD MASTER (Super PM)",
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
      ? history.map(h => `${MEMBERS.find(m => m.id === h.speakerId)?.name}: ${h.message}`).join("\n")
      : "（なし）";

    // プロンプト構築: 各メンバーに順番に発言させるシミュレーション
    const systemInstruction = `
あなたは以下の4人のキャラクターになりきって、プロジェクトの状況について会議（チャット）を行ってください。
必ず JSON 形式の配列でレスポンスを返してください。レスポンスは 3〜5 個の発言を含めてください。

## キャラクター設定
${MEMBERS.map((m) => `- ${m.name} (${m.role}): ${m.personality}`).join("\n")}

## プロジェクト状況
- プロジェクト名: ${questTitle}
- ステータス: ${status}
- メトリクス: ${JSON.stringify(metrics)}

## 今回の議題・追加情報
${topic || "現状の分析と、具体的な対策の提案"}

## これまでの会議の経緯
${historyText}

## 出力フォーマット
[
  { "speakerId": "pmo", "message": "..." },
  { "speakerId": "sales", "message": "..." }
]

## ルール
1. **意見の対立**: メンバーはそれぞれの立場から、他のメンバーの意見に反対したり、疑問を呈したりしてください。特に PMO（硬い）と Sales（ゆるい）は対立しやすいです。
2. **具体的な提案**: 曖昧な助言ではなく、「○○を中止すべき」「○○という人員を追加しよう」といった具体的な「アクション案」を必ず1つ以上含めてください。
3. **継続性**: 「これまでの会議の経緯」がある場合は、それを踏まえた議論にしてください。
4. **完結**: 3〜5回の発言で、一旦議論が区切られるようにしてください。最後の発言は状況に応じて誰がやっても構いませんが、歴史的に重要なら Super PM が締めてください。
`;

    const result = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: topic ? `お題: ${topic}` : "会議を継続または開始せよ。" }] }],
      config: {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        responseMimeType: "application/json",
        maxOutputTokens: 800, // 無駄な出力を抑えて高速化
        thinkingConfig: { thinkingBudget: 0 }, // 思考時間をカットして爆速レスポンス
      },
    });

    const text = result.text ?? "[]";
    // 万が一 ```json 等が含まれていたら除去
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();

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
