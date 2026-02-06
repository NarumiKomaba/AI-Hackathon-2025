# リファクタリング提案書

本文書では、`doc/detailed_design.md` と現在の実装コード（`app/`）の比較分析に基づき、保守性と拡張性を向上させるためのリファクタリング案を提示します。

## 1. 型定義の共通化と設計乖離の解消

### 現状の課題
*   **定義の散在**: `detailed_design.md` で定義された `QuestData`, `WbsItem`, `CouncilLog` 等のインターフェースが、各ファイル（`app/quests/[id]/report/page.tsx`, `app/api/council-meeting/route.ts`）で個別に再定義（コピペ）されています。
*   **不整合のリスク**: 例えば `WbsItem` は、`submit/page.tsx` 内でExcel用型定義 `WbsRow` と混在しており、仕様変更時に修正漏れが発生するリスクがあります。

### 改善案
*   **共通型定義ファイルの作成**: `types/index.ts` または `types/domain.ts` を作成し、共通インターフェースを集約します。
*   **共有**: Frontend / Backend 双方がこの共通ファイルを参照するように修正します。

```typescript
// types/domain.ts (例)
export interface QuestData {
  id: string;
  title: string;
  status: "normal" | "caution" | "danger";
  metrics: { agi: number; hp: number; exp: number };
  // ...
}
```

## 2. プロジェクトID・設定値のハードコーディング解消

### 現状の課題
*   複数のファイルにプロジェクトIDや固定値が埋め込まれています。
    *   `app/api/council-meeting/route.ts`: `const projectId = "core-system";`
    *   `app/api/report/route.ts`: `const projectId = "dummy_projectId";`
*   これにより、本来の「複数プロジェクト管理」機能が機能せず、デモ専用の実装になっています。

### 改善案
*   **動的パラメータ化**: URLパラメータ（`[id]`）やAPIリクエストボディから `projectId` を受け取る実装に変更します。
*   **定数管理**: デフォルト値などの定数は `lib/constants.ts` に集約します。

## 3. Firebase Admin 初期化ロジックの重複排除

### 現状の課題
*   `app/api/council-meeting/route.ts` と `app/api/report/route.ts` の両方で、`service-account.json` を読み込む初期化ロジック `initFirestoreAdmin` が重複しています。
*   既存の `lib/firebaseAdmin.ts` は簡易実装（ADC前提）であり、現状のAPI実装と噛み合っていません。

### 改善案
*   **ライブラリへの集約**: APIルート内の初期化ロジックを `lib/firebaseAdmin.ts` に移動し、シングルトンとして管理します。

```typescript
// lib/firebaseAdmin.ts (修正案)
import admin from "firebase-admin";

export function getAdminFirestore() {
  if (!admin.apps.length) {
    // service-account.json 読み込みロジック
    admin.initializeApp({ ... });
  }
  return admin.firestore();
}
```

## 4. 巨大なルートハンドラー (Fat Controller) の詳細化

### 現状の課題
*   **プレゼンテーションロジックの混入**: PDFプレビュー・生成ロジックにおいて、レイアウト計算やAIによるデータ整形が複雑化しています。以前のPPTX生成（約850行）は廃止されましたが、現在のPDF生成エンジン（Playwright/CSS Print）もさらなるモジュール化が必要です。
*   **プロンプトの埋め込み**: `app/api/report/route.ts` にAIへの指示（プロンプト）がハードコードされており、調整が困難です。

### 改善案
*   **Service層の分離**:
    *   PDF生成・レイアウト提供 → `lib/services/PdfGenerator.ts`
    *   AI対話ロジック → `lib/services/CouncilService.ts`
*   **プロンプトの外部化**: `lib/prompts/` ディレクトリを作成し、プロンプトをテンプレートとして管理します。

## 5. フロントエンドへのビジネスロジック混入の解消

### 現状の課題
*   `app/quest/submit/page.tsx` に以下のバックエンド的処理が含まれています。
    *   Excelファイルの解析 (`xlsx` ライブラリの直接利用)
    *   Firestoreへの大量バッチ書き込み (`saveToFirestore`)

### 改善案
*   **Utilsへの切り出し**: Excelパース処理は `lib/utils/excelParser.ts` 等へ分離。
*   **API経由への変更**: Firestoreへの書き込みは、セキュリティルールや整合性を考慮し、クライアントから直接書くのではなく、データアップロード用APIまたはServer Actions経由での実行を検討します。
