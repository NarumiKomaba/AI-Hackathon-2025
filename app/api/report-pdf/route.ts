import { NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const { projectId } = await req.json();
        if (!projectId) throw new Error("projectId is required");

        const browser = await chromium.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // ホスト名の取得（開発環境なら localhost:3000）
        // 本番環境の場合は環境変数等から取得することを推奨
        const protocol = req.headers.get("x-forwarded-proto") || "http";
        const host = req.headers.get("host") || "localhost:3000";
        const baseUrl = `${protocol}://${host}`;

        const targetUrl = `${baseUrl}/report-preview/${projectId}`;
        console.log(`Generating PDF for: ${targetUrl}`);

        // 読み込み完了まで待機
        await page.goto(targetUrl, { waitUntil: "networkidle" });

        // アニメーションが終わるまで少し待機（重要）
        await page.waitForTimeout(2000);

        // PDF生成（A4横、1280x720のスライドサイズに合わせるためスケーリング）
        const pdfBuffer = await page.pdf({
            width: "1280px",
            height: "720px",
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            pageRanges: "1-99",
            displayHeaderFooter: false,
        });

        await browser.close();

        // PDFをレスポンスとして返す
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="Quest_Report_${projectId}.pdf"`,
            },
        });
    } catch (e: any) {
        console.error("PDF generation error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
