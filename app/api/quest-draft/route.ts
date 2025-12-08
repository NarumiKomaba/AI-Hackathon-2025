import { NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import { adminBucket, adminDb } from "@/lib/firebaseAdmin";
import { v4 as uuidv4 } from "uuid";

const vertex = new VertexAI({
  project: process.env.GCP_PROJECT_ID!,
  location: process.env.GCP_LOCATION!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tempProjectId, hintTitle } = body;

    if (!tempProjectId) {
      return NextResponse.json(
        { error: "tempProjectId is required" },
        { status: 400 }
      );
    }

    // Firestore: questSourceFiles を取得
    const filesSnap = await adminDb
      .collection("questSourceFiles")
      .where("tempProjectId", "==", tempProjectId)
      .get();

    if (filesSnap.empty) {
      return NextResponse.json(
        { error: "No source files found" },
        { status: 404 }
      );
    }

    const sourceFiles = filesSnap.docs.map((doc) => doc.data() as {
      path: string;
      originalName: string;
      type: string;
    });

    const fileParts: any[] = [];

    // PDF を Vertex AI 用に GCS に保存しなおす
    for (const f of sourceFiles) {
      if (f.type !== "application/pdf") continue;

      const file = adminBucket.file(f.path);
      const [buffer] = await file.download();

      const pdfPath = `quests_converted/${tempProjectId}/${uuidv4()}.pdf`;
      const pdfFile = adminBucket.file(pdfPath);

      await pdfFile.save(buffer, { contentType: "application/pdf" });

      fileParts.push({
        fileData: {
          fileUri: `gs://${adminBucket.name}/${pdfPath}`,
          mimeType: "application/pdf",
        },
      });
    }

    const prompt = makePrompt({
      hintTitle,
      fileName: sourceFiles[0].originalName,
    });

    const model = vertex.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [...fileParts, { text: prompt }],
        },
      ],
    });

    const text =
      result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return NextResponse.json(parseQuestDraftFromResponse(text));
  } catch (err) {
    console.error("quest-draft API error:", err);
    return NextResponse.json(
      { error: "Failed to generate quest draft" },
      { status: 500 }
    );
  }
}

function makePrompt(args: {
  fileName: string;
  hintTitle?: string;
}) {
  const { fileName, hintTitle } = args;
  return `
あなたはプロジェクトマネージャー兼ゲームマスターです。
添付されたプロジェクト関連ドキュメント（例: ${fileName} など）を読み、
RPG風の「クエスト概要」を JSON で1件だけ出力してください。

必ず次の JSON フォーマットで返してください（日本語）:

{
  "title": "string",
  "durationDays": number,
  "objective": "string",
  "conditions": ["string", "string", ...],
  "deliverables": ["string", "string", ...],
  "summary": "string",
  "rewards": ["string", "string", ...],
  "expGains": ["string", "string", ...]
}

制約:
- title は 30 文字以内
- durationDays は 7〜180 の整数（日数感でよい）
- objective は 200〜400 文字程度
- conditions は 3〜8 個程度の具体的な達成条件（箇条書き）
- deliverables は 1〜5 個程度の納品物・成果物（箇条書き）
- summary は 200〜400 文字程度のクエスト全体の概要
- rewards は 1〜5 個程度の報酬内容（例: 「ギルド内での評価向上」「実運用のノウハウ獲得」など）
- expGains は 1〜5 個程度の得られる経験・学び（例: 「要件定義スキルの向上」など）

ヒントとなるクエスト名（任意）:
${hintTitle || "（指定なし）"}

ドキュメントからプロジェクトの目的・スコープ・関係者・期間感・成果物を読み取り、
それにふさわしいRPGクエストとして表現してください。
余計な説明文やコメントは出力せず、上記 JSON だけを返してください。
`;
}

function parseQuestDraftFromResponse(text: string) {
  try {
    // ```json ... ``` で返ってきた場合をざっくり剥がす
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("parseQuestDraftFromResponse error:", e, text);
    // パース失敗したら最低限のデフォルトを返す
    return {
      title: "新規プロジェクトクエスト",
      durationDays: 30,
      objective: "",
      conditions: [],
      deliverables: [],
      summary: "",
      rewards: [],
      expGains: [],
    };
  }
}

