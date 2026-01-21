# Project Quest - 詳細設計書 (Basic Design)

## 1. 詳細設計書構成

### 表紙
*   **システム名**: Project Quest (AI-Hackathon-2025)
*   **バージョン**: 0.2.0 (Draft)
*   **作成日**: 2026-01-16
*   **作成者**: AI Assistant (Antigravity)

### 目次
(TBD: 完成後に自動生成または追記)

---

## 2. システム概要

### 2.1 目的と背景
現代のプロジェクト管理は、タスク管理や進捗報告などの事務作業が煩雑になりがちであり、メンバーのモチベーション維持が課題となっています。
本システム「Project Quest」は、仕事のプロジェクトをRPGの「クエスト」に見立て、進捗をステータス（HP, EXP, AGI）として可視化することで、**「やらされ仕事」を「攻略すべき冒険」に変える**ことを目的としています。
また、Gemini 2.5 Flashを活用したWBS自動生成や、定型報告（PowerPoint）の自動化により、PM/PLの事務負荷を劇的に削減します。

### 2.2 全体像 & 機能概要

#### コアコンセプト: "Gamified PM Tool"
*   **クエスト管理**: プロジェクト＝クエスト。WBS＝攻略チャート。
*   **ギルドマスター**: AIがプロジェクトの状況を見て、褒める・叱る・アドバイスする。
*   **自動化魔法**: 面倒なドキュメント作成（WBS, 報告書）をAIとプログラムで瞬殺する。

#### ディレクトリ構成 (Tree)
```text
c:/hackathon/
├── app/
│   ├── api/                # Backend Logic (Next.js API Routes)
│   │   ├── analyze/
│   │   ├── guildmaster-comment/
│   │   ├── quest-draft/    # WBS Generation
│   │   ├── report-pptx/    # PPTX Generation
│   ├── quests/             # Main Dashboard UI
│   ├── page.tsx            # Landing Page
│   └── layout.tsx
├── components/
│   ├── layout/
│   ├── ui/
│   └── ...
├── lib/
│   ├── firebaseAdmin.ts    # Server-side Firebase SDK
│   ├── firebaseClient.ts   # Client-side Firebase SDK
├── doc/                    # Documentation
├── public/                 # Static Assets (Images)
└── ...
```

### 2.3 設計思想・選定理由 (Design Philosophy)

#### Architecture: Next.js App Router & Serverless
*   **選定理由**: Vercel等へのデプロイ容易性、およびAPIルートによるバックエンドロジックの統合管理が可能であるため。App Routerの採用により、React Server Components (RSC) を活用し、初期ロードの高速化とSEO（社内ツールだがメタデータ管理等）を意識。

#### AI Engine: Google Vertex AI (Gemini 2.5 Flash)
*   **選定理由**:
    1.  **マルチモーダル性能**: PDF/Excel等のドキュメントを直接読み込み、高精度に解析できる能力。
    2.  **高速性**: "Flash" モデルによる低レイテンシなレスポンス（UI体験を損なわない）。
    3.  **コストパフォーマンス**: ハッカソンおよび実運用を見据えた際のトークンコストの低さ。

#### UI/UX: Custom Design System (Tailwind CSS)
*   **選定理由**: 既存のUIライブラリ（MUI/Chakra）では「RPG風」の世界観（羊皮紙、木目、ファンタジー装飾）を表現しきれないため、Tailwind CSSを用いたフルカスタムデザインを採用。

---

## 3. 非機能要件
*   **パフォーマンス**: AIレスポンス待ち時間をUX上で隠蔽（「ギルドマスターが思案中...」等の演出）。
*   **可用性**: Firebaseによるフルマネージドなデータストアで、サーバー管理コストをゼロにする。
*   **拡張性**: 新しい「魔法（＝自動化機能）」をAPIルート追加だけで実装可能な構造。

---

## 4. デプロイメントフロー (TBD)
*   GitHub ActionsによるCI/CD（Lint -> Build -> Firebase Hosting / Vercel Deploy）を想定。
