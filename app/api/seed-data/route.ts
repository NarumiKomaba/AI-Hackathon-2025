import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

export const runtime = "nodejs";

const TS = admin.firestore.FieldValue.serverTimestamp;
const fromDate = admin.firestore.Timestamp.fromDate;

/**
 * GET /api/seed-data
 * ダミーデータを Firestore に投入するエンドポイント。
 * 一度だけ叩けば OK。既にデータがある場合は上書きしない安全設計。
 */
export async function GET(): Promise<Response> {
  try {
    const results: string[] = [];

    // ===== 1. testProjects（クエスト） =====
    const projects = [
      {
        docId: "hr-talent-system",
        name: "人材管理システム刷新 編",
        client_name: "人事部",
        pm_name: "田中",
        status: "参加中",
        start_date: fromDate(new Date("2025-08-01")),
        end_date: fromDate(new Date("2026-03-31")),
        overview: "紙とExcelで運用していた人材管理を、クラウドベースのタレントマネジメントシステムに刷新。スキル可視化とキャリアパス提案のAI機能を搭載予定。",
        purpose: "人材データの一元管理と、AI活用によるスキルマッチング・配置最適化の実現",
        success_conditions: [
          "既存人事データの移行完了",
          "スキルマップ自動生成機能のPoC完了",
          "部門長による受入テスト合格",
          "セキュリティ監査クリア",
        ],
        deliverables: [
          "システム要件定義書",
          "データ移行計画書",
          "AI分析PoC環境",
          "運用マニュアル",
        ],
        rewards: [
          "DX推進の社内実績",
          "人事領域のドメイン知識獲得",
          "AI活用ノウハウ蓄積",
        ],
        experience_gains: [
          "PM経験値 +500",
          "データ分析 +300",
          "AI活用 +250",
          "要件定義 +200",
        ],
      },
      {
        docId: "customer-portal",
        name: "顧客ポータルサイト構築 編",
        client_name: "カスタマーサクセス部",
        pm_name: "佐藤",
        status: "参加中",
        start_date: fromDate(new Date("2025-10-01")),
        end_date: fromDate(new Date("2026-04-30")),
        overview: "既存顧客向けのセルフサービスポータルを新規構築。FAQ検索、チケット管理、契約情報確認、請求書ダウンロードなどを提供。チャットボット連携も予定。",
        purpose: "カスタマーサポートの問い合わせ件数30%削減と顧客満足度向上",
        success_conditions: [
          "ポータルUI/UXデザイン確定",
          "SSO認証基盤構築完了",
          "チャットボットの回答精度80%以上",
          "β版リリース＆フィードバック反映",
        ],
        deliverables: [
          "UIデザインカンプ",
          "APIドキュメント",
          "テスト計画書",
          "β版アプリケーション",
        ],
        rewards: [
          "フロントエンド技術力強化",
          "顧客対応ナレッジの蓄積",
        ],
        experience_gains: [
          "フロントエンド +400",
          "UXデザイン +250",
          "API設計 +200",
          "チャットボット +150",
        ],
      },
      {
        docId: "factory-iot",
        name: "工場IoTモニタリング導入 編",
        client_name: "製造部",
        pm_name: "鈴木",
        status: "参加中",
        start_date: fromDate(new Date("2025-11-15")),
        end_date: fromDate(new Date("2026-05-31")),
        overview: "工場の生産ラインにIoTセンサーを設置し、リアルタイムで稼働状況・異常検知・予知保全を実現するシステムの導入。ダッシュボードで全ライン一括監視。",
        purpose: "設備故障の予兆検知による計画外停止ゼロの達成",
        success_conditions: [
          "IoTセンサー設置・通信テスト完了",
          "異常検知アルゴリズムの精度検証",
          "ダッシュボードのリアルタイム表示実現",
          "現場作業員への操作研修完了",
        ],
        deliverables: [
          "IoTアーキテクチャ設計書",
          "センサー設置マニュアル",
          "異常検知モデル",
          "監視ダッシュボード",
        ],
        rewards: [
          "IoT技術の実践経験",
          "製造業ドメイン知識",
          "機械学習の実運用ノウハウ",
        ],
        experience_gains: [
          "IoT +400",
          "インフラ構築 +300",
          "機械学習 +250",
          "データ基盤 +200",
        ],
      },
      {
        docId: "internal-dx-chatbot",
        name: "社内DXチャットボット開発 編",
        client_name: "総務部・情報システム部",
        pm_name: "高橋",
        status: "募集中",
        start_date: fromDate(new Date("2026-01-06")),
        end_date: fromDate(new Date("2026-06-30")),
        overview: "社内の各種申請手続き・IT問い合わせ・経費精算などを自然言語で対応できるAIチャットボットを開発。社内ナレッジベースとRAG連携。",
        purpose: "社内ヘルプデスクの負荷軽減と従業員の自己解決率向上",
        success_conditions: [
          "社内ナレッジベースの整備完了",
          "RAGパイプラインの構築完了",
          "回答精度85%以上達成",
          "全部署への展開完了",
        ],
        deliverables: [
          "ナレッジベース整備レポート",
          "チャットボット設計書",
          "RAG構成図",
          "利用ガイド",
        ],
        rewards: [
          "RAG技術の実践ノウハウ",
          "全社横断プロジェクトの経験",
        ],
        experience_gains: [
          "RAG/LLM +450",
          "ナレッジ管理 +200",
          "社内調整 +300",
        ],
      },
    ];

    for (const p of projects) {
      const ref = adminDb.collection("testProjects").doc(p.docId);
      const existing = await ref.get();
      if (!existing.exists) {
        const { docId, ...data } = p;
        await ref.set({ ...data, created_at: TS(), update_at: TS() });
        results.push(`testProjects/${docId}: 作成`);
      } else {
        results.push(`testProjects/${p.docId}: 既存（スキップ）`);
      }
    }

    // ===== 2. party_members =====
    const partyMembers = [
      // hr-talent-system
      { projectId: "hr-talent-system", role: "勇者", member_name: "田中（あなた）", member_id: "tanaka" },
      { projectId: "hr-talent-system", role: "戦士", member_name: "佐藤", member_id: "sato" },
      { projectId: "hr-talent-system", role: "魔法使い", member_name: "山本", member_id: "yamamoto" },
      { projectId: "hr-talent-system", role: "僧侶", member_name: "渡辺", member_id: "watanabe" },
      // customer-portal
      { projectId: "customer-portal", role: "勇者", member_name: "佐藤（あなた）", member_id: "sato" },
      { projectId: "customer-portal", role: "戦士", member_name: "伊藤", member_id: "ito" },
      { projectId: "customer-portal", role: "魔法使い", member_name: "小林", member_id: "kobayashi" },
      // factory-iot
      { projectId: "factory-iot", role: "勇者", member_name: "鈴木（あなた）", member_id: "suzuki" },
      { projectId: "factory-iot", role: "戦士", member_name: "高橋", member_id: "takahashi" },
      { projectId: "factory-iot", role: "魔法使い", member_name: "中村", member_id: "nakamura" },
      { projectId: "factory-iot", role: "僧侶", member_name: "加藤", member_id: "kato" },
    ];

    // seed用のparty_membersだけ確認（projectIdで判定）
    const seedProjectIds = projects.map((p) => p.docId);
    let partyCreated = 0;
    for (const m of partyMembers) {
      const existing = await adminDb
        .collection("party_members")
        .where("projectId", "==", m.projectId)
        .where("member_id", "==", m.member_id)
        .limit(1)
        .get();
      if (existing.empty) {
        await adminDb.collection("party_members").add(m);
        partyCreated++;
      }
    }
    results.push(`party_members: ${partyCreated}件 作成（${partyMembers.length - partyCreated}件スキップ）`);

    // ===== 3. wbs_items =====
    const wbsItems = [
      // ---- hr-talent-system ----
      {
        projectId: "hr-talent-system",
        title: "現行人事データ棚卸し",
        number: "1", subSystem: "人材管理", phase: "調査",
        category: "データ整理", feature: "データ棚卸し",
        description: "Excel・紙台帳・旧システムに散在する人事データの全量把握",
        status: "完了", progress: 100,
        assignee: "田中", owner: "田中",
        due: "2025-09-30",
        parentId: "research", parentLabel: "調査・分析",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-08-01")),
        plan_end_date: fromDate(new Date("2025-09-30")),
      },
      {
        projectId: "hr-talent-system",
        title: "スキルマップ定義",
        number: "2", subSystem: "人材管理", phase: "設計",
        category: "データモデル", feature: "スキル体系設計",
        description: "全社共通のスキル分類体系（約200項目）をステークホルダーと合意",
        status: "完了", progress: 100,
        assignee: "渡辺", owner: "渡辺",
        due: "2025-10-31",
        parentId: "design", parentLabel: "設計",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-09-15")),
        plan_end_date: fromDate(new Date("2025-10-31")),
      },
      {
        projectId: "hr-talent-system",
        title: "DB設計・テーブル構築",
        number: "3", subSystem: "人材管理", phase: "設計",
        category: "データベース", feature: "テーブル設計",
        description: "PostgreSQLでのテーブル設計。従業員・スキル・評価履歴の正規化",
        status: "完了", progress: 100,
        assignee: "山本", owner: "山本",
        due: "2025-11-30",
        parentId: "design", parentLabel: "設計",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-10-15")),
        plan_end_date: fromDate(new Date("2025-11-30")),
      },
      {
        projectId: "hr-talent-system",
        title: "データ移行スクリプト開発",
        number: "4", subSystem: "人材管理", phase: "実装",
        category: "データ移行", feature: "ETL開発",
        description: "既存Excel・CSVからの自動インポート処理。約8,000件の社員データ対応",
        status: "進行中", progress: 65,
        assignee: "山本", owner: "山本",
        due: "2026-01-15",
        parentId: "impl", parentLabel: "実装",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-12-01")),
        plan_end_date: fromDate(new Date("2026-01-15")),
      },
      {
        projectId: "hr-talent-system",
        title: "スキルマッチングAI PoC",
        number: "5", subSystem: "AI", phase: "PoC",
        category: "AI機能", feature: "マッチングエンジン",
        description: "社員のスキルセットとプロジェクト要件をAIでマッチングするPoCを開発",
        status: "進行中", progress: 40,
        assignee: "田中", owner: "田中",
        due: "2026-02-28",
        parentId: "poc", parentLabel: "AI PoC",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-12-15")),
        plan_end_date: fromDate(new Date("2026-02-28")),
      },
      {
        projectId: "hr-talent-system",
        title: "管理者向けダッシュボード",
        number: "6", subSystem: "UI", phase: "実装",
        category: "画面開発", feature: "ダッシュボード",
        description: "部門長がチームのスキル分布や育成状況を一目で把握できるダッシュボード",
        status: "進行中", progress: 25,
        assignee: "佐藤", owner: "佐藤",
        due: "2026-02-15",
        parentId: "impl", parentLabel: "実装",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-01-06")),
        plan_end_date: fromDate(new Date("2026-02-15")),
      },
      {
        projectId: "hr-talent-system",
        title: "受入テスト・セキュリティ監査",
        number: "7", subSystem: "人材管理", phase: "テスト",
        category: "品質管理", feature: "受入テスト",
        description: "人事部門長による受入テストとセキュリティチームによる個人情報保護監査",
        status: "未着手", progress: 0,
        assignee: "田中", owner: "田中",
        due: "2026-03-20",
        parentId: "test", parentLabel: "テスト",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-03-01")),
        plan_end_date: fromDate(new Date("2026-03-20")),
      },

      // ---- customer-portal ----
      {
        projectId: "customer-portal",
        title: "既存問い合わせ分析",
        number: "1", subSystem: "ポータル", phase: "調査",
        category: "分析", feature: "問い合わせ分類",
        description: "過去1年間の問い合わせ3,000件をカテゴリ別に分類し、チャットボット対応範囲を特定",
        status: "完了", progress: 100,
        assignee: "佐藤", owner: "佐藤",
        due: "2025-11-15",
        parentId: "research", parentLabel: "調査・分析",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-10-01")),
        plan_end_date: fromDate(new Date("2025-11-15")),
      },
      {
        projectId: "customer-portal",
        title: "SSO認証基盤構築",
        number: "2", subSystem: "認証", phase: "実装",
        category: "インフラ", feature: "SAML/OIDC連携",
        description: "既存IdPとのSSO連携。SAML 2.0とOpenID Connectの両方に対応",
        status: "進行中", progress: 70,
        assignee: "伊藤", owner: "伊藤",
        due: "2026-01-31",
        parentId: "infra", parentLabel: "インフラ構築",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-11-15")),
        plan_end_date: fromDate(new Date("2026-01-31")),
      },
      {
        projectId: "customer-portal",
        title: "FAQページ開発",
        number: "3", subSystem: "ポータル", phase: "実装",
        category: "画面開発", feature: "FAQ検索",
        description: "全文検索対応のFAQページ。カテゴリ絞り込み＋関連記事レコメンド付き",
        status: "進行中", progress: 50,
        assignee: "小林", owner: "小林",
        due: "2026-02-15",
        parentId: "impl", parentLabel: "フロントエンド開発",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-12-01")),
        plan_end_date: fromDate(new Date("2026-02-15")),
      },
      {
        projectId: "customer-portal",
        title: "チャットボット開発",
        number: "4", subSystem: "AI", phase: "実装",
        category: "AI機能", feature: "チャットボット",
        description: "Gemini APIベースのカスタマーサポートチャットボット。FAQ・契約情報の自動回答",
        status: "進行中", progress: 30,
        assignee: "佐藤", owner: "佐藤",
        due: "2026-03-15",
        parentId: "impl", parentLabel: "フロントエンド開発",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-01-06")),
        plan_end_date: fromDate(new Date("2026-03-15")),
      },
      {
        projectId: "customer-portal",
        title: "請求書DL機能",
        number: "5", subSystem: "ポータル", phase: "実装",
        category: "画面開発", feature: "帳票ダウンロード",
        description: "契約情報と紐づく請求書PDFのダウンロード機能",
        status: "未着手", progress: 0,
        assignee: "伊藤", owner: "伊藤",
        due: "2026-03-31",
        parentId: "impl", parentLabel: "フロントエンド開発",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-02-15")),
        plan_end_date: fromDate(new Date("2026-03-31")),
      },
      {
        projectId: "customer-portal",
        title: "β版リリース＆フィードバック",
        number: "6", subSystem: "ポータル", phase: "リリース",
        category: "リリース", feature: "β版公開",
        description: "主要顧客10社にβ版を提供し、フィードバックを収集・反映",
        status: "未着手", progress: 0,
        assignee: "佐藤", owner: "佐藤",
        due: "2026-04-15",
        parentId: "release", parentLabel: "リリース",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-04-01")),
        plan_end_date: fromDate(new Date("2026-04-15")),
      },

      // ---- factory-iot ----
      {
        projectId: "factory-iot",
        title: "IoTセンサー選定・調達",
        number: "1", subSystem: "IoT", phase: "調達",
        category: "ハードウェア", feature: "センサー選定",
        description: "温度・振動・電流の3種センサーの比較検討と発注。50台分",
        status: "完了", progress: 100,
        assignee: "中村", owner: "中村",
        due: "2025-12-20",
        parentId: "procurement", parentLabel: "調達",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-11-15")),
        plan_end_date: fromDate(new Date("2025-12-20")),
      },
      {
        projectId: "factory-iot",
        title: "ゲートウェイ設置・通信テスト",
        number: "2", subSystem: "IoT", phase: "構築",
        category: "ネットワーク", feature: "エッジゲートウェイ",
        description: "各ライン端にエッジゲートウェイを設置し、MQTT通信の疎通確認",
        status: "完了", progress: 100,
        assignee: "高橋", owner: "高橋",
        due: "2026-01-15",
        parentId: "infra", parentLabel: "インフラ構築",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-12-20")),
        plan_end_date: fromDate(new Date("2026-01-15")),
      },
      {
        projectId: "factory-iot",
        title: "データ収集パイプライン構築",
        number: "3", subSystem: "データ基盤", phase: "実装",
        category: "データ基盤", feature: "ストリーミングETL",
        description: "センサーデータをリアルタイムでBigQueryに格納するストリーミング基盤",
        status: "進行中", progress: 55,
        assignee: "高橋", owner: "高橋",
        due: "2026-02-15",
        parentId: "impl", parentLabel: "実装",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-01-15")),
        plan_end_date: fromDate(new Date("2026-02-15")),
      },
      {
        projectId: "factory-iot",
        title: "異常検知モデル開発",
        number: "4", subSystem: "AI", phase: "開発",
        category: "機械学習", feature: "異常検知",
        description: "振動データのIsolation ForestとLSTMによるリアルタイム異常検知",
        status: "進行中", progress: 35,
        assignee: "鈴木", owner: "鈴木",
        due: "2026-03-15",
        parentId: "ml", parentLabel: "AI・機械学習",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-01-20")),
        plan_end_date: fromDate(new Date("2026-03-15")),
      },
      {
        projectId: "factory-iot",
        title: "監視ダッシュボード開発",
        number: "5", subSystem: "UI", phase: "実装",
        category: "画面開発", feature: "リアルタイムダッシュボード",
        description: "全ライン一括監視ダッシュボード。異常時のアラート通知連携付き",
        status: "未着手", progress: 0,
        assignee: "加藤", owner: "加藤",
        due: "2026-04-15",
        parentId: "impl", parentLabel: "実装",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-03-01")),
        plan_end_date: fromDate(new Date("2026-04-15")),
      },
      {
        projectId: "factory-iot",
        title: "現場操作研修・本番稼働",
        number: "6", subSystem: "運用", phase: "展開",
        category: "研修", feature: "操作研修",
        description: "工場作業員30名への操作研修と1週間の並行稼働による安定性確認",
        status: "未着手", progress: 0,
        assignee: "鈴木", owner: "鈴木",
        due: "2026-05-15",
        parentId: "deploy", parentLabel: "展開・研修",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-04-15")),
        plan_end_date: fromDate(new Date("2026-05-15")),
      },

      // ---- internal-dx-chatbot (少なめ: まだ募集中) ----
      {
        projectId: "internal-dx-chatbot",
        title: "社内ナレッジベース整備",
        number: "1", subSystem: "ナレッジ", phase: "準備",
        category: "ナレッジ管理", feature: "文書整理",
        description: "社内Wiki・マニュアル・規程集をRAG用にクレンジング・チャンク化",
        status: "進行中", progress: 20,
        assignee: "高橋", owner: "高橋",
        due: "2026-03-31",
        parentId: "prep", parentLabel: "準備",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-01-06")),
        plan_end_date: fromDate(new Date("2026-03-31")),
      },
      {
        projectId: "internal-dx-chatbot",
        title: "RAGパイプライン構築",
        number: "2", subSystem: "AI", phase: "実装",
        category: "AI基盤", feature: "RAG構築",
        description: "Vertex AI Search + Gemini によるRAGパイプラインの構築",
        status: "未着手", progress: 0,
        assignee: "未選択", owner: "未選択",
        due: "2026-05-15",
        parentId: "impl", parentLabel: "実装",
        source_file_name: "seed-data-v2", imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-03-01")),
        plan_end_date: fromDate(new Date("2026-05-15")),
      },
    ];

    const existingWbs = await adminDb.collection("wbs_items").where("source_file_name", "==", "seed-data-v2").limit(1).get();
    if (existingWbs.empty) {
      for (const w of wbsItems) {
        await adminDb.collection("wbs_items").add(w);
      }
      results.push(`wbs_items: ${wbsItems.length}件 作成`);
    } else {
      results.push("wbs_items: シードデータ既存（スキップ）");
    }

    // ===== 4. issue_items =====
    const issueItems = [
      // hr-talent-system
      {
        projectId: "hr-talent-system",
        issue_id: "HR-001", tracker: "バグ", status: "進行中", priority: "高",
        title: "スキルCSVインポート時に文字化け（Shift_JIS→UTF-8変換漏れ）",
        assignee: "山本", category: "データ移行",
        description: "人事部から受領したCSVがShift_JIS。変換処理の不備で一部カラムが文字化けする。",
        source_file_name: "seed-data-v2", imported_at: TS(),
      },
      {
        projectId: "hr-talent-system",
        issue_id: "HR-002", tracker: "Task", status: "新規", priority: "通常",
        title: "個人情報保護方針に基づくアクセス権限設計のレビュー",
        assignee: "渡辺", category: "セキュリティ",
        description: "人事データへのアクセス権限を部門長・HR・本人の3段階で設計。法務部のレビューが必要。",
        source_file_name: "seed-data-v2", imported_at: TS(),
      },
      {
        projectId: "hr-talent-system",
        issue_id: "HR-003", tracker: "バグ", status: "新規", priority: "高",
        title: "スキルマッチングAIが特定部署に偏った推薦を出す",
        assignee: "田中", category: "AI機能",
        description: "営業部のデータが多いため、AIの推薦結果が営業職に偏重。学習データのバランス調整が必要。",
        source_file_name: "seed-data-v2", imported_at: TS(),
      },
      {
        projectId: "hr-talent-system",
        issue_id: "HR-004", tracker: "Task", status: "完了", priority: "低",
        title: "開発環境のステージングサーバー構築",
        assignee: "山本", category: "インフラ",
        description: "AWS上にステージング環境を構築完了。本番同等のスペックで検証可能に。",
        source_file_name: "seed-data-v2", imported_at: TS(),
      },
      // customer-portal
      {
        projectId: "customer-portal",
        issue_id: "CP-001", tracker: "バグ", status: "進行中", priority: "高",
        title: "SSO認証でIdPからのレスポンスが間欠的にタイムアウト",
        assignee: "伊藤", category: "認証",
        description: "既存IdPとの連携で5%程度の確率でタイムアウト。リトライ処理とフォールバック認証の実装が必要。",
        source_file_name: "seed-data-v2", imported_at: TS(),
      },
      {
        projectId: "customer-portal",
        issue_id: "CP-002", tracker: "Task", status: "新規", priority: "通常",
        title: "FAQコンテンツの初期登録（200記事）",
        assignee: "小林", category: "コンテンツ",
        description: "カスタマーサクセス部門が保有するFAQ200記事の初期データ投入と検索精度チューニング。",
        source_file_name: "seed-data-v2", imported_at: TS(),
      },
      {
        projectId: "customer-portal",
        issue_id: "CP-003", tracker: "バグ", status: "新規", priority: "通常",
        title: "チャットボットが英語の問い合わせに日本語で回答してしまう",
        assignee: "佐藤", category: "AI機能",
        description: "多言語対応が不完全。入力言語の自動判定と回答言語の切り替えロジックが未実装。",
        source_file_name: "seed-data-v2", imported_at: TS(),
      },
      // factory-iot
      {
        projectId: "factory-iot",
        issue_id: "IOT-001", tracker: "バグ", status: "進行中", priority: "高",
        title: "第3ラインのセンサーからのデータ欠損（パケットロス15%）",
        assignee: "高橋", category: "ネットワーク",
        description: "WiFi干渉により第3ラインのセンサーデータにパケットロスが発生。有線化を検討中。",
        source_file_name: "seed-data-v2", imported_at: TS(),
      },
      {
        projectId: "factory-iot",
        issue_id: "IOT-002", tracker: "Task", status: "新規", priority: "通常",
        title: "異常検知モデルの閾値チューニング（誤報率を5%以下に）",
        assignee: "鈴木", category: "機械学習",
        description: "現在の異常検知モデルの誤報率が12%。製造部門の許容値5%に収めるためのチューニングが必要。",
        source_file_name: "seed-data-v2", imported_at: TS(),
      },
      {
        projectId: "factory-iot",
        issue_id: "IOT-003", tracker: "Task", status: "完了", priority: "通常",
        title: "BigQueryのパーティション設計確定",
        assignee: "高橋", category: "データ基盤",
        description: "時系列データ用のパーティション設計を確定。日次パーティション＋ラインIDクラスタリング。",
        source_file_name: "seed-data-v2", imported_at: TS(),
      },
    ];

    const existingIssues = await adminDb.collection("issue_items").where("source_file_name", "==", "seed-data-v2").limit(1).get();
    if (existingIssues.empty) {
      for (const i of issueItems) {
        await adminDb.collection("issue_items").add(i);
      }
      results.push(`issue_items: ${issueItems.length}件 作成`);
    } else {
      results.push("issue_items: シードデータ既存（スキップ）");
    }

    // ===== 5. project_status（ギルドマスターコメント用） =====
    const projectStatuses = [
      {
        docId: "status-hr-talent-system",
        project_id: "hr-talent-system",
        projectId: "hr-talent-system",
        summary: {
          wbs: "全7タスク中、完了3件・進行中3件・未着手1件。調査・設計フェーズは完了。データ移行・AIPoC・ダッシュボード開発が並行進行中。全体進捗率は約55%。受入テストは3月開始予定。",
          task: "高優先度バグ2件が未解決。CSVインポートの文字化けとAIの推薦偏り。アクセス権限設計のレビューも未完了。",
          chat: "チーム4名で安定稼働中だが、AI機能の精度改善に想定以上の時間がかかっている。人事部門からは「使ってみたい」と期待の声あり。",
          cost: "予算の50%を消化。AI開発のGPU費用が想定比1.3倍で推移。残り予算内に収めるにはスコープ調整が必要になる可能性あり。",
        },
        updatedAt: TS(), createdAt: TS(),
      },
      {
        docId: "status-customer-portal",
        project_id: "customer-portal",
        projectId: "customer-portal",
        summary: {
          wbs: "全6タスク中、完了1件・進行中3件・未着手2件。SSO認証が70%、FAQ開発50%、チャットボット30%。請求書DL機能とβ版リリースは未着手。全体進捗率は約40%。",
          task: "SSO間欠タイムアウト（高優先度）が未解決。チャットボットの多言語対応も課題。FAQコンテンツ200記事の投入が大量作業として残っている。",
          chat: "3名体制で順調に進行中。ただしカスタマーサクセス部門からのFAQコンテンツ提供が遅延気味。チャットボットのデモは好評。",
          cost: "予算の35%を消化。SSO連携の追加開発費が発生したが、全体としては予算内。β版リリース後の追加要望対応の余力は限定的。",
        },
        updatedAt: TS(), createdAt: TS(),
      },
      {
        docId: "status-factory-iot",
        project_id: "factory-iot",
        projectId: "factory-iot",
        summary: {
          wbs: "全6タスク中、完了2件・進行中2件・未着手2件。センサー選定・ゲートウェイ設置は完了。データパイプラインと異常検知モデルが進行中。ダッシュボードと研修は未着手。全体進捗率は約45%。",
          task: "第3ラインのパケットロス15%（高優先度）が未解決。有線化の追加予算申請中。異常検知の誤報率チューニングも残タスク。BigQuery設計は完了。",
          chat: "4名体制で製造部門との連携も良好。ただし工場側の設備停止スケジュールとの調整で、センサー追加設置に遅れが出ている。現場作業員からは「見える化は嬉しい」と前向きな反応。",
          cost: "予算の40%を消化。有線ネットワーク追加工事の見積もりが想定外（+150万円）。製造部門長への追加予算承認が必要。",
        },
        updatedAt: TS(), createdAt: TS(),
      },
      {
        docId: "status-internal-dx-chatbot",
        project_id: "internal-dx-chatbot",
        projectId: "internal-dx-chatbot",
        summary: {
          wbs: "全2タスク中、進行中1件・未着手1件。ナレッジベース整備が20%進行。RAG構築は3月以降の予定。メンバー募集中のためリソースが限定的。",
          task: "まだ課題は登録されていない。ナレッジベースの品質が成否を分けるため、整備に注力中。",
          chat: "プロジェクト立ち上げ直後。高橋が1名で準備を進めている。追加メンバーの参画が急務。",
          cost: "予算の5%を消化。まだ初期段階。Vertex AI Searchのライセンス費用の見積もり待ち。",
        },
        updatedAt: TS(), createdAt: TS(),
      },
    ];

    for (const ps of projectStatuses) {
      const ref = adminDb.collection("project_status").doc(ps.docId);
      const existing = await ref.get();
      if (!existing.exists) {
        const { docId, ...data } = ps;
        await ref.set(data);
        results.push(`project_status/${docId}: 作成`);
      } else {
        results.push(`project_status/${ps.docId}: 既存（スキップ）`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "シードデータの投入が完了しました",
      details: results,
    });
  } catch (e: unknown) {
    console.error("seed-data error:", e);
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
