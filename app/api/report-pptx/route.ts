import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * ⚠️ DEPRECATED: PPTX生成機能は、PDF出力への一本化に伴い廃止されました。
 * 代わりに /api/report-pdf を使用してください。
 */
export async function POST(req: Request) {
  return NextResponse.json(
    {
      error: "PPTX export is deprecated. Please use PDF export.",
      message: "本システムは報告書プレビューおよびPDF出力に特化したエンジンへ移行しました。"
    },
    { status: 410 }
  );
}

/*
// --- 以前のPPTX生成ロジック（バックアップとしてコメントアウト保持） ---
// 開発者の意向を汲み取り、混乱を防ぐため一度コードはクリアし、必要あればGit履歴から参照する形にします。
// もし再度PPTXが必要になった場合は、このAPIではなく新しいPlaywrightベースの変換などを検討してください。
*/
