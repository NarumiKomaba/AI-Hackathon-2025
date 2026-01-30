const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

// --- 0. Load .env.local if exists ---
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach(line => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
            const value = valueParts.join("=").trim().replace(/^"|"$/g, '');
            process.env[key.trim()] = value;
        }
    });
}
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./service-account.json";
const abs = path.isAbsolute(credPath) ? credPath : path.join(process.cwd(), credPath);
if (!fs.existsSync(abs)) {
    console.error("Service account not found:", abs);
    process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(abs, "utf-8"));
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// --- 2. Prompt & Helpers (Exact copy from app/api/report/route.ts) ---
function toLines(arr, label, max = 200) {
    const sliced = arr.slice(0, max);
    if (sliced.length === 0) return `${label}: (0件)`;
    return [
        `${label}: (${sliced.length}件)`,
        ...sliced.map((x) => JSON.stringify(x)),
    ].join("\n");
}

function buildPmoWeeklySlidesPrompt(params) {
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
2. **文字数制限と改行**:
   - スライド内の各テキスト文（summary_textやdescriptionなど）は、**1行あたり最大120文字**としてください。
   - 120文字を超える場合は、適切な位置に ""\\n"" を挿入して改行してください。
   - 適切な改行が無い場合はペナルティを与えます。
3. **課題スライドの分割**:
   - 「課題状況」セクションでは、「課題状況まとめ」「課題状況詳細」の2パターン作成します。
   - 「課題状況まとめ」は1枚作成してください
   - 「課題状況詳細」は**重要な課題1つにつきスライドを1枚作成**してください。
   - 重要な課題が3つあれば、課題用スライドが3枚生成されます（1枚にまとめないこと）。
   - 複数課題を1枚にまとめた場合はペナルティを与えます。
4. **注意事項の遵守*:
   - 注意事項に従わない場合はペナルティを与えます。
   - 後述する分析・生成ルールに従わない場合はペナルティを与えます。
5. **chartsは必須*:
  - charts を空配列にしてはいけない。
  - charts フィールドを省略してはいけない。
  - 数値データが不足・不明な場合は、論理的に妥当な仮定値を生成してよい。
    その場合：
    - values は 0〜100 または工数・金額として自然な整数
    - labels は 1〜5 件

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
2. ページ構成の動的調整:
   - 遅延タスクや重要課題が多い場合は無理に1枚に収めず、同じタイプのスライドを複数出力してページ分割すること
   - 逆に特記すべき事項がない項目はスキップ可
   - 想定枚数: 8〜12枚程度

# 出力フォーマット（JSON Schema）
以下のJSON構造を厳守してください。ルートは配列です。
**JSON以外は一切出力しないでください。**

[
  {
    "slide_id": 1,
    "title": "プロジェクト総評",
    "content_type": "text_summary",
    "body": {
      "status_label": "🔴 危険 / 🟡 注意 / 🟢 順調 のいずれか",
      "summary_text": "全体状況の要約文章（150文字程度）。なぜそのステータスなのかの核心を書く。120文字を超えたら\\\\nで改行。",
      "key_points": [
        "進捗: XX% (遅延/順調)",
        "コスト: 予算内/超過見込み",
        "品質: 注意/危険/順調"
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

async function fetchByProjectEitherKey(collection, projectId, limit = 500) {
    const snap1 = await db.collection(collection).where("project_id", "==", projectId).limit(limit).get();
    if (!snap1.empty) return snap1.docs.map((d) => d.data());
    const snap2 = await db.collection(collection).where("projectId", "==", projectId).limit(limit).get();
    return snap2.docs.map((d) => d.data());
}

async function main() {
    const projectId = "core-system";
    console.log("Fetching raw data for project:", projectId);

    const [wbs_items, issue_items, chat_messages, profit_items] = await Promise.all([
        fetchByProjectEitherKey("wbs_items", projectId),
        fetchByProjectEitherKey("issue_items", projectId),
        fetchByProjectEitherKey("chat_messages", projectId),
        fetchByProjectEitherKey("profit_items", projectId),
    ]);

    console.log(`- WBS items: ${wbs_items.length}`);
    console.log(`- Issue items: ${issue_items.length}`);
    console.log(`- Chat messages: ${chat_messages.length}`);
    console.log(`- Profit items: ${profit_items.length}`);

    const prompt = buildPmoWeeklySlidesPrompt({
        wbs_data_text: toLines(wbs_items, "WBS"),
        redmine_data_text: toLines(issue_items, "ISSUE"),
        teams_chat_data_text: toLines(chat_messages, "CHAT"),
        budget_data: toLines(profit_items, "BUDGET"),
    });

    console.log("Generating progress_report via Gemini (Vertex AI mode)...");
    const ai = new GoogleGenAI({
        vertexai: true,
        project: process.env.GCP_PROJECT_ID,
        location: process.env.GCP_LOCATION || "asia-northeast1",
    });

    const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    const rawText = result.text;
    const match = rawText.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Could not find JSON array in AI response");
    const slides = JSON.parse(match[0]);
    const reportJson = JSON.stringify({ slides }, null, 2);

    console.log("Updating Firestore document 8QSIF8XHeoo6GeXmg8jO...");
    await db.collection("project_status").doc("8QSIF8XHeoo6GeXmg8jO").update({
        progress_report: reportJson,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("Success! progress_report has been rebuilt with the official prompt.");
}

main().catch(err => {
    console.error("Manual Rebuild Failed:", err);
    process.exit(1);
});
