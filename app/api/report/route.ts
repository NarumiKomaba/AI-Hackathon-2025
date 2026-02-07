import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/* ================================
   Firestore helpers
================================ */
async function fetchByProjectEitherKey(
  db: FirebaseFirestore.Firestore,
  collection: string,
  projectId: string,
  limit = 500
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

function toLines(arr: unknown[], label: string, max = 200) {
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
function buildPmoWeeklySlidesPrompt(params: {
  wbs_data_text: string;
  redmine_data_text: string;
  teams_chat_data_text: string;
  budget_data: string;
}) {
  const { wbs_data_text, redmine_data_text, teams_chat_data_text, budget_data } = params;

  return `
# 命令
あなたは大規模システム開発プロジェクトの優秀なPMO（プロジェクトマネジメントオフィス）担当者です。
以下の4つの[入力データ]を分析・統合し、経営層およびチームに向けた「週次進捗報告」のPowerPointスライド構成案を作成してください。

出力は、後続のPythonスクリプトで自動処理するため、必ず**指定されたJSON形式**のみを出力してください。

# 前提条件（トーン、マナー、フォーマット）
- 目的: プロジェクト進捗報告および承認獲得
- 聴衆: 課長。複数プロジェクトの報告をPMから受ける立場
- 文章量: プロジェクトの実態と課題をPMに次いで理解できる内容量
- トーン: ロジカル、客観的、説得力重視
- デザイン規定:
  - メインカラー: ディープブルー（信頼感）
  - アクセントカラー: 明るいオレンジ（重要事項の強調）

# 重要注意事項（厳守）
1. **JSONの構文エラー防止**: 改行コードは必ず ""\\n"" とエスケープしてください。
2. **表紙・目次の生成禁止**: 
   - 表紙(Cover)と目次(TOC)はシステムが自動生成するため、**絶対に出力しないでください。**
   - 1枚目のスライドは必ず「プロジェクト総評」から開始してください。
3. **課題スライドの徹底分割**:
   - 「課題状況詳細(issue_text)」は、必ず**1枚につき1つの課題のみ**を記述してください。
   - \`table_rows\` に複数の課題を並べないでください。1つの重大な課題を1枚かけて深く分析すること。
4. **要素数の最適化**:
   - charts を含むスライドでは、グラフの数は**最大3つ**に絞ってください。
   - 4つ以上あるとレイアウトが崩れるため、重要度の高いものから順に採用してください。
5. **文字数と視認性**:
   - \`summary_text\` や \`forecast_comment\` は、150〜200文字程度に要約してください。
   - UIで自動改行されるため、文中での手動の ""\\n"" 挿入は最小限（箇条書き程度）で構いません。

# 入力データ
1. [WBSデータ]:
${wbs_data_text}

2. [課題管理(Redmine/Issue)]:
${redmine_data_text}

3. [チャットログ(Teams)]:
${teams_chat_data_text}

4. [採算・工数データ]:
${budget_data}

# 分析・生成ルール
1. 情報の統合:
   - 単にデータを並べず、WBS遅延に対し「Issueが原因」「チャットの仕様齟齬が背景」等の因果関係を分析して記述すること
2. ページ構成の徹底的な分割:
   - **「1枚に詰め込む」ことは最大の禁忌です。**
   - 重要な課題は必ず「1課題につき1スライド」作成すること。3つあれば3枚作ってください。
   - コスト状況や実績も、項目が多くなり1枚のフォントサイズが小さくなるくらいなら、迷わず「コスト状況(1)」「コスト状況(2)」のようにスライドを分けてください。
   - 想定枚数は制限せず、10〜15枚程度になっても構いません。

# 出力フォーマット（JSON Schema）
以下のJSON構造を厳守してください。ルートは配列です。
**JSON以外は一切出力しないでください。**

[
  {
    "slide_id": 1,
    "title": "プロジェクト総評",
    "content_type": "text_summary",
    "body": {
      "status_label": "🔴 危機一髪 / 🟡 要警戒 / 🟢 冒険は順調 のいずれか",
      "summary_text": "勇者の視点での総括（150文字程度）。現状の戦況（進捗）をドラマチックかつ客観的に要約。120文字を超えたら\\\\nで改行。",
      "key_points": [
        "現在のレベル: 進捗率 XX%",
        "パーティの士気: コスト状況のメタファ",
        "立ちはだかる強敵: 最大の懸念事項"
      ]
    }
  },
  {
    "slide_id": 2,
    "title": "前週までの実績",
    "content_type": "bullet_points",
    "body": {
      "items": [
        "MM/DD: [機能名]の実装完了 (WBS)",
        "MM/DD: [バグID]の修正対応完了 (Redmine)"
      ]
    }
  },
  {
    "slide_id": 3,
    "title": "課題状況まとめ",
    "content_type": "issue_table",
    "body": {
      "table_headers": ["ID", "課題名", "ステータス", "優先度", "担当者", "期限", "進捗影響"],
      "table_rows": [
        ["101", "ログインエラー", "進行中", "高" ,"斎藤" ,"2025/8/1" , "有"],
        ["102", "排他制御バグ", "進行中", "高" ,"佐藤" ,"2025/8/5" , "有"],
        ["103", "UI微調整", "完了", "低" ,"田中" ,"2025/7/30" , "無"]
      ]
    }
  },
  {
    "slide_id": 4,
    "title": "重要課題",
    "content_type": "issue_text",
    "body": {
      "table_headers": ["ID", "課題名", "ステータス", "優先度", "担当者", "期限", "進捗影響"],
      "table_rows": [
        ["101", "ログインエラー", "進行中", "高", "担当者", "2025/8/1", "有"]
      ],
      "critical_issue_analysis": "課題の影響、WBS遅延との関係、背景(Teams)と具体アクション(いつまでに/誰が)。120文字超は\\\\n改行。"
    }
  },
  {
    "slide_id": 5,
    "title": "来週以降の主なイベント",
    "content_type": "bullet_points",
    "body": { "items": ["..."] }
  },
  {
    "slide_id": 6,
    "title": "補足事項",
    "content_type": "text_simple",
    "body": { "text": "..." }
  },
  {
    "slide_id": 7,
    "title": "コスト状況詳細",
    "content_type": "multi_chart_and_text",
    "body": {
      "charts": [
        { "title": "社員工数(H)", "labels": ["計画", "実績"], "values": [1000, 1050] },
        { "title": "派遣工数(H)", "labels": ["計画", "実績"], "values": [2000, 1800] },
        { "title": "委託費(万円)", "labels": ["計画", "実績"], "values": [500, 500] }
      ],
      "forecast_comment": "社員工数はバグ対応で微増傾向ですが、派遣リソースの調整により全体では予算内を維持できる見込みです。\\nただし委託先A社の検収遅れがリスクとして残っているため、来週の進捗次第では再見積もりが必要です。\\n残バジェットはXX%あり、現状の消化ペースであれば年度末まで持ちこたえると判断しています。"
    }
  }
]
`.trim();
}

/* ================================
   Parse JSON
================================ */
function parseSlidesJsonFromResponse(text: string) {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) {
    throw new Error("JSON配列抽出に失敗");
  }

  const jsonStr = m[0];
  const slides = JSON.parse(jsonStr);

  if (!Array.isArray(slides)) {
    throw new Error("JSONは配列ではありません");
  }

  return { slides, jsonStr };
}

/* ================================
   Vertex generate
================================ */
export async function generateWeeklySlidesJson(prompt: string) {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GCP_PROJECT_ID!,
    location: process.env.GCP_LOCATION!,
  });

  const resp = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = resp.text ?? "";
  return { rawText: text, ...parseSlidesJsonFromResponse(text) };
}
/* ================================
   Route
================================ */
export async function POST(req: Request) {
  try {
    const { note, projectId: reqPid } = await req.json() as { note?: string, projectId?: string };
    const projectId = reqPid || "core-system";

    const [wbs_items, issue_items, chat_messages, profit_items] =
      await Promise.all([
        fetchByProjectEitherKey(adminDb, "wbs_items", projectId, 800),
        fetchByProjectEitherKey(adminDb, "issue_items", projectId, 800),
        fetchByProjectEitherKey(adminDb, "chat_messages", projectId, 800),
        fetchByProjectEitherKey(adminDb, "profit_items", projectId, 800),
      ]);

    const prompt = buildPmoWeeklySlidesPrompt({
      wbs_data_text: toLines(wbs_items, "WBS"),
      redmine_data_text: toLines(issue_items, "ISSUE"),
      teams_chat_data_text: toLines(chat_messages, "CHAT"),
      budget_data: toLines(profit_items, "BUDGET"),
    });

    const { slides } = await generateWeeklySlidesJson(prompt);

    // ✅ progress_report に保存する
    const reportJson = JSON.stringify({ slides });

    // 指定された projectId に合致するドキュメントを探して更新、なければ新規作成
    const statusQuery = await adminDb.collection("project_status").where("project_id", "==", projectId).limit(1).get();

    if (!statusQuery.empty) {
      const docId = statusQuery.docs[0].id;
      await adminDb.collection("project_status").doc(docId).update({
        progress_report: reportJson,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // projectId でも検索（揺れ対応）
      const statusQuery2 = await adminDb.collection("project_status").where("projectId", "==", projectId).limit(1).get();
      if (!statusQuery2.empty) {
        const docId = statusQuery2.docs[0].id;
        await adminDb.collection("project_status").doc(docId).update({
          progress_report: reportJson,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // 新規作成
        await adminDb.collection("project_status").add({
          project_id: projectId,
          progress_report: reportJson,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    return NextResponse.json({
      projectId,
      slides,
    });
  } catch (e: unknown) {
    console.error("❌ report generation failed:", e);

    const message =
      e instanceof Error ? e.message : "unknown error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
