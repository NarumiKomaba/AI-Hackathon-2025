const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load service account
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./service-account.json";
const abs = path.isAbsolute(credPath) ? credPath : path.join(process.cwd(), credPath);

if (!fs.existsSync(abs)) {
    console.error("Service account file not found at:", abs);
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(abs, "utf-8"));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const projectId = "core-system";

const sampleReport = {
    project_id: projectId,
    project_name: "基幹システム刷新プロジェクト",
    progress_report: JSON.stringify({
        slides: [
            {
                content_type: "text_summary",
                title: "エグゼクティブサマリー",
                body: {
                    summary_text: "本プロジェクトは現在、要件定義フェーズの終盤に差し掛かっており、概ね順調に進捗している。一方で、一部のインターフェース仕様において調整に時間を要しており、開発フェーズへの影響が懸念される。",
                    key_points: [
                        "全体進捗率は65%で、当初計画比-2%の微増遅延。",
                        "予算（HP）は計画内に収まっており、コスト超過の懸念は現時点ではない。",
                        "次週より統合テスト環境の構築に着手予定。"
                    ]
                }
            },
            {
                content_type: "bullet_points",
                title: "主要トピックと成果",
                body: {
                    items: [
                        "DBマイグレーションツールのプロトタイプ検証が成功。本番移行時間を30%短縮可能であることを確認。",
                        "ユーザーヒアリングを通じて、新UIの承認フローにおける不備を特定・修正完了。",
                        "インフラ構築チームとの連携強化により、サーバー調達リードタイムを1週間短縮。"
                    ]
                }
            },
            {
                content_type: "issue_table",
                title: "懸案事項とリスク",
                body: {
                    table_headers: ["ID", "課題内容", "ステータス", "優先度", "期限"],
                    table_rows: [
                        ["ISS-001", "対外接続GWのセキュリティ要件の乖離", "進行中", "高", "2026-02-15"],
                        ["ISS-002", "海外拠点のデータ移行用帯域不足の可能性", "未着手", "中", "2026-03-01"],
                        ["ISS-003", "特定保守ベンダーのリソース枯渇懸念", "監視中", "中", "2026-02-28"]
                    ]
                }
            },
            {
                content_type: "table_and_text",
                title: "リカバリー策の詳細分析",
                body: {
                    table_headers: ["課題ID", "リカバリー策", "担当", "予定"],
                    table_rows: [
                        ["ISS-001", "代替プロトコルの採用検討と、情報セキュリティ部との緊急協議", "機律 PMO", "2026-02-05"]
                    ],
                    analysis_text: "対外接続GWの課題については、現行の暗号化方式が新システムの要件を満たさないことが判明した。代替方式の採用により、開発工数が約10人日増加する見込みだが、現行のバッファ内で吸収可能である。"
                }
            }
        ]
    }, null, 2)
};

async function seed() {
    console.log("Seeding report for project:", projectId);

    // Find existing or create new doc
    const snapshot = await db.collection("project_status").where("project_id", "==", projectId).get();

    if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        console.log("Updating existing document:", docId);
        await db.collection("project_status").doc(docId).set(sampleReport, { merge: true });
    } else {
        console.log("Creating new document...");
        await db.collection("project_status").add(sampleReport);
    }

    console.log("Seed completed successfully!");
}

seed().then(() => process.exit(0)).catch(err => {
    console.error("Seed failed:", err);
    process.exit(1);
});
