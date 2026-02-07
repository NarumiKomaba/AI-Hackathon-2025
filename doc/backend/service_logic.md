# サービスロジック & AIプロンプト設計 (Service Logic)

## 1. AIプロンプトエンジニアリング

### 1.1 ギルドマスターの人格定義 (Persona)
本システムでは、AIを一貫して「ギルドマスター」として振る舞わせるため、以下のシステムプロンプトを全部署で共有・適用します。

> **Role**: あなたはファンタジーRPGの世界にある「冒険者ギルド」のグランドマスターです。
> **Tone**: 威厳があるが、部下（プレイヤー）を思う温かみもある老人口調（「〜じゃ」「〜であるな」「うむ」など）。
> **Task**: プロジェクトの進捗データ（JSON）を読み、褒めるべき点は褒め、リスク（デバフ状態）には警告を与え、具体的なアクションプランを短く助言してください。

### 1.2 WBS生成ロジック (Quest Draft)
ドキュメント（非構造化データ）からJSON（構造化データ）への変換には、Gemini 2.5 FlashのContext Caching（またはLong Context）を活用します。

*   **入力**: SOW (作業範囲記述書), 要件定義書, 会議議事録 (PDF/Text)
*   **Extraction Prompt**:
    1.  ドキュメントから「プロジェクトのゴール」「納期」「主要な成果物」を抽出。
    2.  それらをRPG用語に変換する（例：納期→討伐期限、成果物→ドロップアイテム）。
    3.  `JSON Schema` に従い、ValidなJSONのみを出力するよう制約をかける。

---

### 1.3 AI評議会 (Council of AI)
多対多の議論シミュレーションを実現するため、Geminiに対して「台本形式」での出力を指示します。

*   **構造化プロンプト**:
    *   システムプロンプト内で4人の人格（PMO, Sales, Manager, Super PM）を詳細に定義。
    *   **「対立構造（Conflict）」** を明示的に指示し、予定調和ではない議論を生成させる。
    *   ユーザーの入力（`topic`）および過去の会話履歴（`history`）をコンテキストとして含める。
*   **Speed Tuning**:
    *   ハッカソンデモ用にレスポンス速度を最優先。
    *   Gemini 2.5 Flashを使用し、`thinkingBudget: 0`、`maxOutputTokens: 800` に設定。

---


## 2. バッチ処理・非同期処理

### 2.1 PDF解析パイプライン
Next.jsのAPIルートは実行時間に制限（Vercel Hobby版等）があるため、大きなファイルの解析は以下のフローを推奨とします（現状は同期処理で実装済みだが、将来的な拡張案）。

1.  Client -> GCSへDirect Upload。
2.  Cloud Functions Trigger -> ファイルアップロード検知。
3.  Cloud Functions -> Vertex AIへ解析リクエスト。
4.  結果をFirestore (`questDrafts/{id}`) に書き込み。
5.  Client -> FirestoreをListenしてリアルタイム更新。

---
