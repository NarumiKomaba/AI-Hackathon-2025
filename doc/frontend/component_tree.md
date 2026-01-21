# コンポーネントツリー設計 (Component Tree)

## 1. ディレクトリ構造とアトミックデザイン
本プロジェクトでは厳密なAtomic Designではありませんが、再利用性に基づいた階層構造を採用しています。

```text
components/
├── ui/                 # Atoms/Molecules (汎用パーツ)
│   ├── Button/
│   ├── Card/
│   ├── Badge/
│   ├── ProgressBar/
│   └── DonutChart/     # SVG使用のカスタムチャート
├── layout/             # Templates/Organisms (構造・配置)
│   ├── ProjectQuestLayout.tsx  # 全ページの共通枠（ヘッダー・背景）
│   └── SectionContainer.tsx
└── page-parts/         # Organisms (ページ固有の大きな塊)
    ├── quests/
    │   ├── QuestListSidebar.tsx
    │   ├── ProgressView.tsx    # 進捗タブの中身
    │   ├── GanttView.tsx       # ガントチャートタブの中身
    │   └── TaskListView.tsx    # タスクリストタブの中身
    └── ...
```

---

## 2. 共通UIコンポーネント仕様

### `ProjectQuestLayout`
*   **役割**: アプリケーション全体の背景（RPG風のテクスチャ）、および「Project Quest」ロゴ、グローバルナビゲーションを提供。
*   **Props**: `children: ReactNode`

### `DonutChart`
*   **役割**: 進捗率や予算消化率を表示する円グラフ。
*   **Props**: 
    *   `value: number` (0-100)
    *   `color: string` (チャートの色)
    *   `size: "sm" | "md" | "lg"`

### `GanttChart` (Custom Canvas/Grid)
*   **技術**: HTML/CSS Grid または Canvaを使用せず、`div`の絶対配置とCSS Gridの組み合わせで軽量に実装。
*   **機能**:
    *   日付ヘッダーの自動生成（プロジェクト期間に合わせて）。
    *   タスクの開始〜終了バーの描画。
    *   今日の日付ライン（カレントライン）の表示。

---

## 3. 状態管理 (State Management)

### ローカルステート vs グローバルステート
*   **Global**: 基本的には URL Query Parameters (`?questId=...`) を利用し、リロードしても状態が維持される設計とする（Deep Linking）。
*   **Local (Page Level)**: `activeTab` (進捗/ガント/タスク) などの一時的なUI状態は `useState` で管理。
*   **Server State**: SWR または React Server Components + `fetch` でデータ取得を行い、キャッシュ管理する。

---
