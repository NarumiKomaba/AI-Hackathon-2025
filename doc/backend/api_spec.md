# API仕様書 (API Specification)

## 1. 概要
Next.js App RouterのRoute Handlersを使用したAPIエンドポイント定義。
認証は現状簡易的（またはFirebase Auth Tokenの検証を想定）とする。

---

## 2. エンドポイント一覧

### 2.1 Guild Master Comment API
*   **Path**: `/api/guildmaster-comment`
*   **Method**: `POST`
*   **Summary**: クエストの状況を受け取り、ギルドマスター（AI）からのコメントと機嫌を返す。

#### Request Body
```json
{
  "questTitle": "基幹システム刷新",
  "recommendedLevel": 50,
  "elapsedDays": 120,
  "status": "進行中",
  "metrics": [
    { "key": "agi", "value": 65, "label": "進捗" },
    { "key": "hp", "value": 40, "label": "予算" }
  ],
  "debuffs": [
    { "id": "meeting-hell", "label": "会議地獄" }
  ],
  "tasks": [
    { "title": "環境構築", "status": "完了", "due": "2025-12-01" }
  ]
}
```

#### Response (Success: 200 OK)
```json
{
  "comment": "うむ、環境構築は順調じゃな。だがHP（予算）が減ってきておるぞ、気を引き締めよ！",
  "mood": "normal"  // "smile" | "normal" | "strict"
}
```

---

### 2.2 Quest Draft API (WBS Generation)
*   **Path**: `/api/quest-draft`
*   **Method**: `POST`
*   **Summary**: アップロード済みのドキュメントを解析し、クエストのドラフト（WBS案）を生成する。

#### Request Body
```json
{
  "tempProjectId": "uuid-v4-string",
  "hintTitle": "営業支援新システム"  // 任意: ユーザーからのヒント
}
```

#### Response (Success: 200 OK)
```json
{
  "title": "営業支援システム開発クエスト",
  "durationDays": 180,
  "objective": "営業効率を20%向上させるためのモバイル対応Webアプリ開発",
  "conditions": ["モバイル対応必須", "SSO連携"],
  "deliverables": ["要件定義書", "基本設計書", "ソースコード"],
  "summary": "営業部隊からの悲痛な叫びに応え、伝説の武器（iPad）で使える魔導書を作るのじゃ。",
  "rewards": ["営業部長からの感謝状", "部門予算増額"],
  "expGains": ["Reactスキル", "Azure運用経験"]
}
```

---

### 2.3 Report PDF/PPTX API
*   **Path**: `/api/report-pptx`
*   **Method**: `POST`
*   **Summary**: JSONデータからPowerPoint(.pptx)ファイルを生成してバイナリで返す。

#### Request Body
```json
{
  "projectId": "quest-001",
  "projectName": "基幹刷新",
  "slides": [
    {
      "content_type": "text_summary",
      "body": {
        "summary_text": "今週は順調に進捗。",
        "key_points": ["サーバー手配完了", "NW開通遅延なし"]
      }
    },
    {
      "content_type": "issue_table",
      "body": {
        "table_headers": ["ID", "課題内容", "担当", "期限"],
        "table_rows": [
          ["1", "認証エラー発生", "田中", "2025-12-10"],
          ["2", "API仕様未定", "佐藤", "2025-12-15"]
        ]
      }
    }
  ]
}
```

#### Response (Success: 200 OK)
*   Content-Type: `application/vnd.openxmlformats-officedocument.presentationml.presentation`
*   Body: Binary data of .pptx file.

### 2.4 Council Meeting API
*   **Path**: `/api/council-meeting`
*   **Method**: `POST`
*   **Summary**: 4人のAI評議会メンバーが議論を行い、結論と具体的なアクションプランを出力する。
*   **Note**: `maxOutputTokens` を制限し、Thinking Budgetを0に設定して高速化している。

#### Request Body
```json
{
  "questId": "core-system",
  "topic": "進捗遅延について",
  "history": [
    { "speakerId": "pmo", "name": "PMO", "message": "リスクが高まっています。" },
    { "speakerId": "user", "name": "YOU", "message": "具体策はあるか？" }
  ]
}
```

#### Response (Success: 200 OK)
```json
{
  "logs": [
    {
      "speakerId": "sales",
      "name": "営業",
      "message": "顧客には正直に話しましょう！",
      "icon": "/images/council_sales.png"
    },
    {
      "speakerId": "super_pm",
      "name": "Super PM",
      "message": "では、一部機能をPhase2へ回す方向で調整する。",
      "icon": "/images/council_super_pm.png"
    }
  ]
}
```

---
