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
        docId: "core-system",
        name: "基幹システム刷新 編",
        client_name: "社内IT部門",
        pm_name: "駒場",
        status: "参加中",
        start_date: fromDate(new Date("2025-09-01")),
        end_date: fromDate(new Date("2026-03-31")),
        overview: "老朽化した基幹システムをクラウドネイティブに刷新するプロジェクト。マイクロサービス化とAI活用を軸に、業務効率を2倍にすることを目指す。",
        purpose: "レガシーシステムの脱却と業務効率化、AI活用基盤の構築",
        success_conditions: [
          "主要業務のAPI化完了",
          "AI要約機能のPoC完了",
          "移行リハーサル成功",
          "本番切替計画の承認",
        ],
        deliverables: [
          "システム設計書",
          "API仕様書",
          "移行計画書",
          "PoCデモ環境",
        ],
        rewards: [
          "ギルド内での評価大幅向上",
          "クラウド設計ノウハウ獲得",
          "AI活用スキル習得",
        ],
        experience_gains: [
          "PM経験値 +500",
          "クラウド設計 +300",
          "AI活用 +200",
          "関係者調整 +150",
        ],
      },
      {
        docId: "sales-ui",
        name: "営業支援アプリ UI 改修",
        client_name: "営業部",
        pm_name: "駒場",
        status: "募集中",
        start_date: fromDate(new Date("2025-12-15")),
        end_date: fromDate(new Date("2026-04-30")),
        overview: "営業部門が使用するCRMアプリのUI/UXを全面リニューアル。モバイル対応とダッシュボード強化が主眼。",
        purpose: "営業現場の使いやすさ向上とデータ活用促進",
        success_conditions: [
          "ユーザーインタビュー完了",
          "プロトタイプ承認",
          "UIコンポーネント設計完了",
        ],
        deliverables: [
          "UIデザインモックアップ",
          "プロトタイプ",
          "コンポーネントライブラリ",
        ],
        rewards: [
          "UXデザインスキル向上",
          "営業部門との信頼関係構築",
        ],
        experience_gains: [
          "フロントエンド +300",
          "UXデザイン +200",
          "ヒアリング +150",
        ],
      },
      {
        docId: "onprem-llm",
        name: "オンプレ LLM 検証クエスト",
        client_name: "情報セキュリティ部",
        pm_name: "駒場",
        status: "参加中",
        start_date: fromDate(new Date("2025-11-01")),
        end_date: fromDate(new Date("2026-02-28")),
        overview: "社内データをクラウドに出さずにLLMを活用するため、オンプレミス環境でのLLM構築と検証を行う。GPU環境の選定からファインチューニングまで。",
        purpose: "セキュリティ要件を満たしたLLM活用の実現可能性検証",
        success_conditions: [
          "GPU環境のベンチマーク完了",
          "文字起こし精度90%以上達成",
          "セキュリティ審査通過",
          "運用コスト試算完了",
        ],
        deliverables: [
          "ベンチマーク報告書",
          "精度検証レポート",
          "運用設計書",
          "コスト試算書",
        ],
        rewards: [
          "LLM技術ノウハウ蓄積",
          "セキュリティ部門との連携強化",
        ],
        experience_gains: [
          "オンプレLLM +400",
          "インフラ構築 +250",
          "セキュリティ +200",
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
      // core-system
      { projectId: "core-system", role: "勇者", member_name: "駒場（あなた）", member_id: "komaba" },
      { projectId: "core-system", role: "戦士", member_name: "大和", member_id: "yamato" },
      { projectId: "core-system", role: "魔法使い", member_name: "小﨑", member_id: "kozaki" },
      // onprem-llm
      { projectId: "onprem-llm", role: "勇者", member_name: "駒場（あなた）", member_id: "komaba" },
      { projectId: "onprem-llm", role: "戦士", member_name: "中澤", member_id: "nakazawa" },
    ];

    // 既存の party_members を確認してから追加
    const existingParty = await adminDb.collection("party_members").limit(1).get();
    if (existingParty.empty) {
      for (const m of partyMembers) {
        await adminDb.collection("party_members").add(m);
      }
      results.push(`party_members: ${partyMembers.length}件 作成`);
    } else {
      results.push("party_members: 既存データあり（スキップ）");
    }

    // ===== 3. wbs_items =====
    const wbsItems = [
      // core-system のWBS
      {
        projectId: "core-system",
        title: "要件定義",
        number: "1",
        subSystem: "基幹",
        phase: "要件定義",
        category: "業務分析",
        feature: "現行業務フロー分析",
        description: "現行システムの業務フローを可視化し、課題を整理",
        status: "完了",
        progress: 100,
        assignee: "駒場",
        owner: "駒場",
        due: "2025-10-15",
        parentId: "rd",
        parentLabel: "要件定義",
        source_file_name: "seed-data",
        imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-09-01")),
        plan_end_date: fromDate(new Date("2025-10-15")),
      },
      {
        projectId: "core-system",
        title: "API設計",
        number: "2",
        subSystem: "基幹",
        phase: "設計",
        category: "アーキテクチャ",
        feature: "REST API設計",
        description: "マイクロサービス間のAPI仕様を策定",
        status: "完了",
        progress: 100,
        assignee: "大和",
        owner: "大和",
        due: "2025-11-30",
        parentId: "design",
        parentLabel: "設計",
        source_file_name: "seed-data",
        imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-10-16")),
        plan_end_date: fromDate(new Date("2025-11-30")),
      },
      {
        projectId: "core-system",
        title: "DB移行スクリプト作成",
        number: "3",
        subSystem: "基幹",
        phase: "実装",
        category: "データ移行",
        feature: "DB移行ツール",
        description: "Oracle→PostgreSQLのデータ移行スクリプトの開発",
        status: "進行中",
        progress: 60,
        assignee: "小﨑",
        owner: "小﨑",
        due: "2026-01-31",
        parentId: "impl",
        parentLabel: "実装",
        source_file_name: "seed-data",
        imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-12-01")),
        plan_end_date: fromDate(new Date("2026-01-31")),
      },
      {
        projectId: "core-system",
        title: "AI要約機能 PoC",
        number: "4",
        subSystem: "AI機能",
        phase: "PoC",
        category: "AI活用",
        feature: "議事録AI要約",
        description: "Gemini APIを用いた議事録自動要約のPoC開発",
        status: "進行中",
        progress: 45,
        assignee: "駒場",
        owner: "駒場",
        due: "2026-02-15",
        parentId: "poc",
        parentLabel: "PoC開発",
        source_file_name: "seed-data",
        imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-12-15")),
        plan_end_date: fromDate(new Date("2026-02-15")),
      },
      {
        projectId: "core-system",
        title: "移行リハーサル",
        number: "5",
        subSystem: "基幹",
        phase: "移行",
        category: "移行",
        feature: "リハーサル実施",
        description: "本番データを用いた移行リハーサルの計画と実施",
        status: "未着手",
        progress: 0,
        assignee: "駒場",
        owner: "駒場",
        due: "2026-03-15",
        parentId: "migration",
        parentLabel: "移行",
        source_file_name: "seed-data",
        imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-02-16")),
        plan_end_date: fromDate(new Date("2026-03-15")),
      },
      {
        projectId: "core-system",
        title: "結合テスト",
        number: "6",
        subSystem: "基幹",
        phase: "テスト",
        category: "品質管理",
        feature: "結合テスト実施",
        description: "各マイクロサービス間の結合テスト",
        status: "未着手",
        progress: 0,
        assignee: "大和",
        owner: "大和",
        due: "2026-03-10",
        parentId: "test",
        parentLabel: "テスト",
        source_file_name: "seed-data",
        imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-02-01")),
        plan_end_date: fromDate(new Date("2026-03-10")),
      },
      // sales-ui のWBS
      {
        projectId: "sales-ui",
        title: "営業担当ヒアリング",
        number: "1",
        subSystem: "CRM",
        phase: "要件整理",
        category: "要件整理・ヒアリング",
        feature: "ユーザーインタビュー",
        description: "営業メンバー10名へのヒアリングと課題整理",
        status: "進行中",
        progress: 30,
        assignee: "駒場",
        owner: "駒場",
        due: "2026-01-31",
        parentId: "research",
        parentLabel: "要件整理・ヒアリング",
        source_file_name: "seed-data",
        imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-12-15")),
        plan_end_date: fromDate(new Date("2026-01-31")),
      },
      {
        projectId: "sales-ui",
        title: "UIモックアップ作成",
        number: "2",
        subSystem: "CRM",
        phase: "デザイン",
        category: "UI設計",
        feature: "Figmaモック",
        description: "主要画面のモックアップをFigmaで作成",
        status: "未着手",
        progress: 0,
        assignee: "未選択",
        owner: "未選択",
        due: "2026-02-28",
        parentId: "design",
        parentLabel: "デザイン",
        source_file_name: "seed-data",
        imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-02-01")),
        plan_end_date: fromDate(new Date("2026-02-28")),
      },
      {
        projectId: "sales-ui",
        title: "ダッシュボード設計",
        number: "3",
        subSystem: "CRM",
        phase: "設計",
        category: "機能設計",
        feature: "ダッシュボード",
        description: "売上・KPIダッシュボードの設計とデータソース定義",
        status: "未着手",
        progress: 0,
        assignee: "未選択",
        owner: "未選択",
        due: "2026-03-15",
        parentId: "design",
        parentLabel: "デザイン",
        source_file_name: "seed-data",
        imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-02-15")),
        plan_end_date: fromDate(new Date("2026-03-15")),
      },
      // onprem-llm のWBS
      {
        projectId: "onprem-llm",
        title: "GPU環境構築",
        number: "1",
        subSystem: "インフラ",
        phase: "環境構築",
        category: "環境構築",
        feature: "NVIDIA A100環境セットアップ",
        description: "オンプレ環境にNVIDIA A100を設置しCUDA環境を構築",
        status: "完了",
        progress: 100,
        assignee: "中澤",
        owner: "中澤",
        due: "2025-12-15",
        parentId: "env",
        parentLabel: "環境構築",
        source_file_name: "seed-data",
        imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-11-01")),
        plan_end_date: fromDate(new Date("2025-12-15")),
      },
      {
        projectId: "onprem-llm",
        title: "文字起こし精度検証",
        number: "2",
        subSystem: "AI",
        phase: "検証",
        category: "検証タスク",
        feature: "Whisper精度検証",
        description: "Whisper large-v3の文字起こし精度を社内会議録音で検証",
        status: "進行中",
        progress: 50,
        assignee: "中澤",
        owner: "中澤",
        due: "2026-01-31",
        parentId: "eval",
        parentLabel: "検証タスク",
        source_file_name: "seed-data",
        imported_at: TS(),
        plan_start_date: fromDate(new Date("2025-12-16")),
        plan_end_date: fromDate(new Date("2026-01-31")),
      },
      {
        projectId: "onprem-llm",
        title: "セキュリティ審査対応",
        number: "3",
        subSystem: "セキュリティ",
        phase: "審査",
        category: "セキュリティ",
        feature: "審査資料作成",
        description: "情報セキュリティ部門の審査に必要な資料作成と対応",
        status: "進行中",
        progress: 30,
        assignee: "駒場",
        owner: "駒場",
        due: "2026-02-15",
        parentId: "security",
        parentLabel: "セキュリティ",
        source_file_name: "seed-data",
        imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-01-01")),
        plan_end_date: fromDate(new Date("2026-02-15")),
      },
      {
        projectId: "onprem-llm",
        title: "LLMファインチューニング",
        number: "4",
        subSystem: "AI",
        phase: "開発",
        category: "検証タスク",
        feature: "モデル最適化",
        description: "社内データでLlama2をファインチューニングし精度向上",
        status: "未着手",
        progress: 0,
        assignee: "中澤",
        owner: "中澤",
        due: "2026-02-28",
        parentId: "eval",
        parentLabel: "検証タスク",
        source_file_name: "seed-data",
        imported_at: TS(),
        plan_start_date: fromDate(new Date("2026-02-01")),
        plan_end_date: fromDate(new Date("2026-02-28")),
      },
    ];

    const existingWbs = await adminDb.collection("wbs_items").where("source_file_name", "==", "seed-data").limit(1).get();
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
      // core-system
      {
        projectId: "core-system",
        issue_id: "1001",
        tracker: "バグ",
        status: "進行中",
        priority: "高",
        title: "Oracle→PostgreSQL移行時にNULL値の変換エラー",
        assignee: "小﨑",
        category: "データ移行",
        description: "NUMBER型カラムのNULL値がPostgreSQLのinteger型に変換される際にエラーが発生する。COALESCE関数での対応を検討中。",
        source_file_name: "seed-data",
        imported_at: TS(),
      },
      {
        projectId: "core-system",
        issue_id: "1002",
        tracker: "Task",
        status: "新規",
        priority: "通常",
        title: "API認証方式の選定（OAuth2.0 vs API Key）",
        assignee: "大和",
        category: "アーキテクチャ",
        description: "マイクロサービス間の認証方式を決定する必要がある。セキュリティ部門との調整も含む。",
        source_file_name: "seed-data",
        imported_at: TS(),
      },
      {
        projectId: "core-system",
        issue_id: "1003",
        tracker: "バグ",
        status: "新規",
        priority: "高",
        title: "Gemini API のレスポンスタイムアウト（30秒超過）",
        assignee: "駒場",
        category: "AI活用",
        description: "議事録が長文の場合にGemini APIの応答が30秒を超えてタイムアウトする。チャンク分割を検討。",
        source_file_name: "seed-data",
        imported_at: TS(),
      },
      {
        projectId: "core-system",
        issue_id: "1004",
        tracker: "Task",
        status: "完了",
        priority: "通常",
        title: "開発環境のDocker Compose構成確定",
        assignee: "大和",
        category: "環境構築",
        description: "開発メンバー全員が同じ環境で開発できるようDocker Compose構成を確定した。",
        source_file_name: "seed-data",
        imported_at: TS(),
      },
      // onprem-llm
      {
        projectId: "onprem-llm",
        issue_id: "2001",
        tracker: "バグ",
        status: "進行中",
        priority: "高",
        title: "GPU温度が85℃を超えると推論速度が50%低下",
        assignee: "中澤",
        category: "インフラ",
        description: "冷却が不十分なため高負荷時にサーマルスロットリングが発生。追加冷却装置の導入を検討。",
        source_file_name: "seed-data",
        imported_at: TS(),
      },
      {
        projectId: "onprem-llm",
        issue_id: "2002",
        tracker: "Task",
        status: "新規",
        priority: "通常",
        title: "社内ネットワークポリシーでのLLMサーバー通信許可申請",
        assignee: "駒場",
        category: "セキュリティ",
        description: "情報セキュリティ部門へのネットワーク通信許可申請が必要。申請フォームの準備中。",
        source_file_name: "seed-data",
        imported_at: TS(),
      },
      {
        projectId: "onprem-llm",
        issue_id: "2003",
        tracker: "Task",
        status: "完了",
        priority: "低",
        title: "ベンチマーク用テストデータセットの準備",
        assignee: "中澤",
        category: "検証",
        description: "社内会議100件の録音データをベンチマーク用に匿名化して準備完了。",
        source_file_name: "seed-data",
        imported_at: TS(),
      },
    ];

    const existingIssues = await adminDb.collection("issue_items").where("source_file_name", "==", "seed-data").limit(1).get();
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
        docId: "status-core-system",
        project_id: "core-system",
        projectId: "core-system",
        summary: {
          wbs: "全6タスク中、完了2件・進行中2件・未着手2件。要件定義とAPI設計は完了。DB移行とAI PoC が進行中だが、移行リハーサルとテストは未着手。全体進捗率は約40%。",
          task: "バグ2件（高優先度）が未解決。Oracle→PostgreSQL移行のNULL値変換エラーとGemini APIタイムアウトが主要課題。API認証方式の選定タスクも残存。",
          chat: "チーム内の雰囲気は概ね前向きだが、移行スケジュールの遅延リスクへの懸念がある。会議が週5回と多く、集中時間の確保が課題。",
          cost: "現時点で予算の45%を消化。残り55%で移行・テスト・本番切替を実施する必要あり。GPU追加費用の承認待ち。",
        },
        updatedAt: TS(),
        createdAt: TS(),
      },
      {
        docId: "status-onprem-llm",
        project_id: "onprem-llm",
        projectId: "onprem-llm",
        summary: {
          wbs: "全4タスク中、完了1件・進行中2件・未着手1件。GPU環境構築は完了。文字起こし検証とセキュリティ審査が進行中。ファインチューニングは未着手。",
          task: "GPU熱暴走問題（高優先度）が進行中。ネットワークポリシー申請も未完了。ベンチマーク用データは準備完了。",
          chat: "技術的な挑戦にチームは意欲的。ただしセキュリティ部門との調整に時間がかかっており、やや停滞感あり。",
          cost: "予算の35%を消化。GPU追加冷却装置の費用が想定外。残り予算内でのやりくりが必要。",
        },
        updatedAt: TS(),
        createdAt: TS(),
      },
      {
        docId: "status-sales-ui",
        project_id: "sales-ui",
        projectId: "sales-ui",
        summary: {
          wbs: "全3タスク中、進行中1件・未着手2件。ヒアリングが30%進行。UIモックとダッシュボード設計は未着手。",
          task: "現時点で課題は登録されていない。ヒアリング結果次第で要件変更の可能性あり。",
          chat: "プロジェクト開始直後のため、チーム編成が未確定。メンバー募集中の状態。",
          cost: "予算の10%を消化。まだ初期段階のため大きな支出なし。",
        },
        updatedAt: TS(),
        createdAt: TS(),
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
