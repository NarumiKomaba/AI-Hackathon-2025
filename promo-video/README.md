# Project Quest Demo Video (Remotion)

Gemini 1.5 Flash を搭載した次世代プロジェクト管理ツール **"Project Quest"** のプロモーション動画作成プロジェクトです。

## 🎬 デモ動画
YouTubeで完成した動画をご覧いただけます：
[**【Project Quest】デモ動画はこちら**](ここにYouTubeのURLをペーストしてね💕)

---

## 🛠️ プロジェクトの構成

- **Remotion**: Reactを使用してプログラムベースで動画を編集。
- **Google Cloud Text-to-Speech**: ナレーション音声の自動生成。
- **FFmpeg (NVENC)**: GPUを使用した爆速レンダリング。

### 📁 主要なディレクトリ

- `src/`: 動画の構成、タイミング、字幕、レイアウトのコード。
- `scripts/`: ナレーション生成用スクリプト (`generate_narration.js`)。
- `public/`: 素材（BGM、ナレーション、録画済み動画ベース）。

---

## 🚀 セットアップと実行

### 1. 依存関係のインストール
```bash
npm install
```

### 2. ナレーションの生成 (Optional)
Google Cloudのサービスアカウントキー (`service-account.json`) を配置し、以下のスクリプトを実行するとナレーションを自動生成します。
```bash
node scripts/generate_narration.js
```

### 3. プレビューの起動
```bash
npm run dev
```

### 4. レンダリング (GPU使用)
```bash
npx remotion render FinalDemo --ffmpeg-override="-c:v h264_nvenc -pix_fmt yuv420p"
```
※標準レンダリングは `npx remotion render FinalDemo` です。

---

## ⚠️ 注意事項
リポジトリを軽量に保つため、ベースとなる大きなソース動画 (`public/demo-video.mp4`) は Git 管理から除外されています。
自分でビルド・レンダリングを行う場合は、該当の場所に動画ファイルを配置してください。
