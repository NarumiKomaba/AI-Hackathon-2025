import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProjectStatus = {
  project_name?: string;
  projectName?: string;
  name?: string;
  title?: string;
};

type ReqBody = {
  projectId?: string;
  projectStatus?: ProjectStatus;
  project_status?: ProjectStatus;
  projectName?: string;
  slides: unknown[];
};

type PptxWriteResult = Buffer | Uint8Array | ArrayBuffer;

/** ここは「使う分だけ」最小限で型定義（pptxgenjsの実体に寄せる） */
type PptxGenLike = {
  layout: string;
  addSlide: () => SlideLike;

  ChartType: {
    bar: unknown;
  };

  write: (opts: { outputType: "nodebuffer" }) => Promise<PptxWriteResult>;
};

type SlideLike = {
  background?: { color: string };

  addText: (text: string, options: Record<string, unknown>) => void;
  addShape: (type: string, options: Record<string, unknown>) => void;
  addTable: (
    rows: Array<Array<{ text: string; options?: Record<string, unknown> }>>,
    options: Record<string, unknown>
  ) => void;
  addChart: (chartType: unknown, data: unknown, options: Record<string, unknown>) => void;
};

type SlideContentType =
  | "text_summary"
  | "bullet_points"
  | "issue_table"
  | "issue_text"
  | "table_and_text"
  | "multi_chart_and_text"
  | "text_simple";

type SlideJson = {
  content_type?: SlideContentType;
  title?: unknown;
  body?: unknown;
} & Record<string, unknown>;

function safeStr(v: unknown, max = 200) {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > max ? s.slice(0, max) + "..." : s;
}

function getProjectNameFromStatus(projectStatus?: ProjectStatus, fallback?: string) {
  const name =
    projectStatus?.project_name ??
    projectStatus?.projectName ??
    projectStatus?.name ??
    projectStatus?.title ??
    fallback ??
    "週次進捗報告";
  return String(name);
}

function normalizeText(v: unknown) {
  if (v === null || v === undefined) return "";
  let s = String(v);

  // JSONの中で "\\n" が入ってくるケース（= 文字として \n が入ってる）を改行に戻す
  s = s.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "\n");

  // 実改行コードの統一
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 末尾の不要な空白を軽く整形（必要なら外してOK）
  s = s.replace(/[ \t]+\n/g, "\n");

  return s;
}

function isSlideJson(v: unknown): v is SlideJson {
  return typeof v === "object" && v !== null;
}

/** ====== Layout Const (LAYOUT_WIDE) ======
 * 13.333 x 7.5 inch
 */

function addCoverSafe(pptx: PptxGenLike) {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addShape("rtTriangle", {
    x: 3.33,
    y: 0,
    w: 10.0,
    h: 7.5,
    fill: { color: "005AAA" },
    line: { color: "005AAA" },
  });

  slide.addShape("rtTriangle", {
    x: 3.33,
    y: 5.0,
    w: 5.0,
    h: 2.5,
    fill: { color: "64B4EB" },
    line: { color: "64B4EB" },
  });

  // ===== ロゴ =====
  slide.addText("CTC", {
    x: 10.4,
    y: 0.6,
    w: 2.6,
    h: 0.6,
    fontFace: "Arial",
    fontSize: 32,
    bold: true,
    color: "FFFFFF",
    align: "right",
  });

  // ===== タイトル =====
  slide.addText("週次進捗報告", {
    x: 0.8,
    y: 5.2,
    w: 6.5,
    h: 1.0,
    fontFace: "Meiryo UI",
    fontSize: 40,
    bold: true,
    color: "000000",
  });

  slide.addText("CTC Financial Services Group", {
    x: 0.8,
    y: 6.6,
    w: 6.5,
    h: 0.4,
    fontFace: "Meiryo UI",
    fontSize: 16,
    bold: true,
    color: "333333",
  });
}

function addHeaderFooter(slide: SlideLike, pageNumStr: string) {
  // 右上ロゴ
  slide.addText("CTC", {
    x: 10.3,
    y: 0.25,
    w: 2.8,
    h: 0.5,
    fontFace: "Arial",
    fontSize: 28,
    bold: true,
    color: "005AAA",
    align: "right",
  });
  slide.addText("Challenging Tomorrow's Changes", {
    x: 10.3,
    y: 0.75,
    w: 2.8,
    h: 0.3,
    fontFace: "Arial",
    fontSize: 9,
    italic: true,
    color: "005AAA",
    align: "right",
  });

  // 左下 3ブロック（Colab風）
  const iconX = 0.55;
  const iconY = 6.85;
  const s = 0.18;
  const g = 0.03;

  slide.addShape("rect", {
    x: iconX,
    y: iconY,
    w: s,
    h: s,
    fill: { color: "64B4EB" },
    line: { color: "64B4EB" },
  });
  slide.addShape("rect", {
    x: iconX + s + g,
    y: iconY,
    w: s,
    h: s,
    fill: { color: "005AAA" },
    line: { color: "005AAA" },
  });
  slide.addShape("rect", {
    x: iconX,
    y: iconY + s + g,
    w: s,
    h: s,
    fill: { color: "005AAA" },
    line: { color: "005AAA" },
  });

  // 左下フッター文
  slide.addText("無限の未来と、幾千のテクノロジーをつなぐ。", {
    x: 0.95,
    y: 6.78,
    w: 6.5,
    h: 0.25,
    fontFace: "Meiryo UI",
    fontSize: 9,
    color: "666666",
  });
  slide.addText("CTC Financial Services Group", {
    x: 0.95,
    y: 6.95,
    w: 6.5,
    h: 0.4,
    fontFace: "Meiryo UI",
    fontSize: 14,
    bold: true,
    color: "333333",
  });

  // 右下ページ番号
  slide.addText(`© 2025 CTC Financial Services Group All rights reserved.   ${pageNumStr}`, {
    x: 7.0,
    y: 7.05,
    w: 6.2,
    h: 0.3,
    fontFace: "Arial",
    fontSize: 8,
    color: "666666",
    align: "right",
  });
}

function addPageTitle(slide: SlideLike, pageNo: number, title: string) {
  const y = 0.95;

  slide.addShape("triangle", {
    x: 0.45,
    y,
    w: 0.55,
    h: 0.55,
    fill: { color: "005AAA" },
    line: { color: "005AAA" },
    rotate: 90,
  });

  slide.addText(`P${String(pageNo).padStart(2, "0")}`, {
    x: 1.05,
    y: y - 0.05,
    w: 1.3,
    h: 0.6,
    fontFace: "Arial",
    fontSize: 24,
    bold: true,
    color: "000000",
    valign: "middle",
  });

  slide.addShape("rect", {
    x: 2.0,
    y: y - 0.05,
    w: 0.03,
    h: 0.65,
    fill: { color: "000000" },
    line: { color: "000000" },
  });

  slide.addText(normalizeText(title ?? "No Title"), {
    x: 2.15,
    y: y - 0.12,
    w: 10.9,
    h: 0.8,
    fontFace: "Meiryo UI",
    fontSize: 26,
    bold: true,
    color: "000000",
    valign: "middle",
  });
}

function paginateSlides(slides: unknown[], bulletMax = 7): SlideJson[] {
  const out: SlideJson[] = [];

  for (const s of slides) {
    if (!isSlideJson(s)) continue;

    const slide: SlideJson = s;

    const c = slide.content_type;
    const body =
      typeof slide.body === "object" && slide.body !== null
        ? (slide.body as Record<string, unknown>)
        : {};

    if (c === "bullet_points") {
      const items = Array.isArray(body.items) ? body.items.map((v: unknown) => String(v ?? "")) : [];

      if (items.length > bulletMax) {
        const chunks = Array.from({ length: Math.ceil(items.length / bulletMax) }, (_, i) =>
          items.slice(i * bulletMax, (i + 1) * bulletMax)
        );

        const baseTitle = typeof slide.title === "string" ? slide.title : "No Title";

        chunks.forEach((chunk, idx) => {
          out.push({
            ...slide,
            title: `${baseTitle} (${idx + 1}/${chunks.length})`,
            body: { ...body, items: chunk },
          });
        });
        continue;
      }
    }

    if (c === "issue_table" || c === "issue_text" || c === "table_and_text") {
      const headers = Array.isArray(body.table_headers) ? body.table_headers.map((h: unknown) => String(h ?? "")) : [];

      let rows: unknown[] = Array.isArray(body.table_rows) ? body.table_rows : [];
      if (rows.length > 0 && !Array.isArray(rows[0])) rows = [rows];

      const safeRows: string[][] = rows.map((r) => (Array.isArray(r) ? r.map((v: unknown) => String(v ?? "")) : []));

      const baseTitle = typeof slide.title === "string" ? slide.title : "No Title";
      const maxTableH = c === "issue_table" ? 4.6 : 3.0;

      const { chunks } = splitRowsByEstimatedHeight(headers, safeRows, 11.8, maxTableH);

      if (chunks.length > 1) {
        chunks.forEach((chunk, idx) => {
          out.push({
            ...slide,
            title: `${baseTitle} (${idx + 1}/${chunks.length})`,
            body: { ...body, table_rows: chunk },
          });
        });
        continue;
      }
    }

    out.push(slide);
  }

  return out;
}

// ====== Table layout heuristics (pptxgenjs) ======
const COLOR_CTC_BLUE = "005AAA";

function isCJK(ch: string) {
  return /[\u3000-\u9FFF\uFF00-\uFFEF]/.test(ch);
}

function estimateLines(text: string, colWInch: number) {
  const s = String(text ?? "");
  if (!s) return 1;

  const charsPerInch = 10;
  const cap = Math.max(6, Math.floor(colWInch * charsPerInch));

  let units = 0;
  for (const ch of s) units += isCJK(ch) ? 1.8 : 1.0;

  const lineBreaks = (s.match(/\n/g) || []).length;
  const lines = Math.ceil(units / cap) + lineBreaks;

  return Math.max(1, lines);
}

function estimateRowHeightInch(cells: string[], colW: number[]) {
  const base = 0.32;
  const perLine = 0.18;
  let maxLines = 1;

  for (let i = 0; i < Math.min(cells.length, colW.length); i++) {
    const lines = estimateLines(String(cells[i] ?? ""), colW[i]);
    if (lines > maxLines) maxLines = lines;
  }
  return base + (maxLines - 1) * perLine;
}

function deriveColWeights(headers: string[]) {
  return headers.map((h) => {
    const hs = String(h ?? "");
    if (hs.includes("ID")) return 0.9;
    if (hs.includes("課題") || /Subject|Name/i.test(hs)) return 5.0;
    if (hs.includes("ステータス") || /Status/i.test(hs)) return 1.2;
    if (hs.includes("優先") || /Priority/i.test(hs)) return 1.2;
    if (hs.includes("影響") || /Impact/i.test(hs)) return 1.2;
    if (hs.includes("担当") || /Assignee/i.test(hs)) return 1.8;
    if (hs.includes("期限") || /Due/i.test(hs)) return 1.6;
    return 2.0;
  });
}

function weightsToColW(totalW: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map((w) => (totalW * w) / sum);
}

function splitRowsByEstimatedHeight(headers: string[], rows: string[][], totalW: number, maxTableH: number) {
  const colW = weightsToColW(totalW, deriveColWeights(headers));
  const headerH = 0.42;
  const topPad = 0.05;

  const chunks: string[][][] = [];
  let cur: string[][] = [];
  let curH = headerH + topPad;

  for (const r of rows) {
    const rh = estimateRowHeightInch(r, colW);
    if (cur.length > 0 && curH + rh > maxTableH) {
      chunks.push(cur);
      cur = [];
      curH = headerH + topPad;
    }
    cur.push(r);
    curH += rh;
  }

  if (cur.length) chunks.push(cur);

  return { chunks, colW };
}

function renderTable(slide: SlideLike, headers: unknown[], rows: unknown[], x: number, y: number, w: number) {
  const safeHeaders = Array.isArray(headers) ? headers.map((h) => normalizeText(h ?? "")) : [];
  const safeRows = Array.isArray(rows)
    ? rows.map((r) => (Array.isArray(r) ? r.map((c) => normalizeText(c ?? "")) : [normalizeText(r ?? "")]))
    : [];

  const colW = weightsToColW(w, deriveColWeights(safeHeaders));

  const headerRow = safeHeaders.map((h) => ({
    text: h,
    options: {
      fill: COLOR_CTC_BLUE,
      color: "FFFFFF",
      bold: true,
      align: "center",
      valign: "middle",
      fontFace: "Meiryo UI",
      fontSize: 12,
      margin: 2,
    },
  }));

  function colAlignByHeader(h: string) {
    const hs = String(h ?? "");
    if (hs.includes("ID")) return "center";
    if (hs.includes("ステータス") || /Status/i.test(hs)) return "center";
    if (hs.includes("優先") || /Priority/i.test(hs)) return "center";
    if (hs.includes("影響") || /Impact/i.test(hs)) return "center";
    if (hs.includes("期限") || /Due/i.test(hs)) return "center";
    if (hs.includes("担当") || /Assignee/i.test(hs)) return "center";
    return "left";
  }
  const colAlign = safeHeaders.map(colAlignByHeader);

  const bodyRows = safeRows.map((r) =>
    r.map((c, cIdx) => ({
      text: c,
      options: {
        color: "000000",
        fontFace: "Meiryo UI",
        fontSize: 12,
        valign: "top",
        align: colAlign[cIdx] ?? "left",
        margin: 2,
      },
    }))
  );

  slide.addTable([headerRow, ...bodyRows], {
    x,
    y,
    w,
    colW,
    border: { type: "solid", color: "CFCFCF", pt: 1 },
    fill: "FFFFFF",
    valign: "middle",
    fontFace: "Meiryo UI",
    fontSize: 12,
  });

  return { colW };
}

function renderContent(pptx: PptxGenLike, slide: SlideLike, data: SlideJson) {
  const cType = data.content_type;
  const body =
    typeof data.body === "object" && data.body !== null ? (data.body as Record<string, unknown>) : {};

  const baseX = 0.8;
  const startY = 2.0;
  const contentW = 11.8;
  const footerY = 6.85;

  if (cType === "text_summary") {
    const summary = normalizeText(body.summary_text ?? "");
    slide.addText(summary, {
      x: baseX,
      y: startY,
      w: contentW,
      h: 1.4,
      fontFace: "Meiryo UI",
      fontSize: 16,
      color: "000000",
      valign: "top",
    });

    const points = Array.isArray(body.key_points) ? body.key_points.map((p: unknown) => normalizeText(p ?? "")) : [];
    if (points.length) {
      const boxY = startY + 1.55;
      const boxH = Math.max(1.2, Math.min(footerY - boxY - 0.1, 0.5 + 0.35 * points.length));

      slide.addShape("rect", {
        x: baseX,
        y: boxY,
        w: contentW,
        h: boxH,
        fill: { color: "EBF5FF" },
        line: { color: "EBF5FF" },
      });

      slide.addText(points.map((p) => `• ${normalizeText(p)}`).join("\n"), {
        x: baseX + 0.2,
        y: boxY + 0.15,
        w: contentW - 0.4,
        h: boxH - 0.3,
        fontFace: "Meiryo UI",
        fontSize: 16,
        bold: true,
        color: "000000",
        valign: "top",
      });
    }
    return;
  }

  if (cType === "bullet_points") {
    const items = Array.isArray(body.items) ? body.items.map((it: unknown) => normalizeText(it ?? "")) : [];
    slide.addText(items.map((it) => `▶ ${normalizeText(it)}`).join("\n"), {
      x: baseX,
      y: startY,
      w: contentW,
      h: footerY - startY,
      fontFace: "Meiryo UI",
      fontSize: 20,
      color: "000000",
      valign: "top",
      lineSpacingMultiple: 1.2,
    });
    return;
  }

  if (cType === "issue_table") {
    renderTable(
      slide,
      Array.isArray(body.table_headers) ? body.table_headers : [],
      Array.isArray(body.table_rows) ? body.table_rows : [],
      baseX,
      startY,
      contentW
    );
    return;
  }

  if (cType === "issue_text" || cType === "table_and_text") {
    const headers = Array.isArray(body.table_headers) ? body.table_headers.map((h: unknown) => String(h ?? "")) : [];

    let rows: unknown[] = Array.isArray(body.table_rows) ? body.table_rows : [];
    if (rows.length > 0 && !Array.isArray(rows[0])) rows = [rows];

    const safeRows: string[][] = rows.map((r) => (Array.isArray(r) ? r.map((v: unknown) => String(v ?? "")) : []));

    const { colW } = renderTable(slide, headers, safeRows, baseX, startY, contentW);

    const headerH = 0.42;
    let tableH = headerH + 0.05;
    for (const r of safeRows) tableH += estimateRowHeightInch(r, colW);

    const analysis = normalizeText(body.critical_issue_analysis ?? body.analysis_text ?? "");
    if (analysis) {
      const textStartY = startY + Math.min(tableH + 0.35, 4.9);
      const availableH = Math.max(1.2, footerY - textStartY - 0.1);

      slide.addText("▼ 詳細分析・リカバリ策", {
        x: baseX,
        y: textStartY - 0.33,
        w: contentW,
        h: 0.3,
        fontFace: "Meiryo UI",
        fontSize: 14,
        bold: true,
        color: "FF6400",
      });

      slide.addShape("rect", {
        x: baseX,
        y: textStartY,
        w: contentW,
        h: availableH,
        fill: { color: "FFF5EB" },
        line: { color: "FFF5EB" },
      });

      slide.addText(analysis, {
        x: baseX + 0.2,
        y: textStartY + 0.15,
        w: contentW - 0.4,
        h: availableH - 0.3,
        fontFace: "Meiryo UI",
        fontSize: 14,
        color: "000000",
        valign: "top",
      });
    }
    return;
  }

  if (cType === "multi_chart_and_text") {
    const chartsRaw = Array.isArray(body.charts) ? body.charts : [];
    const charts = chartsRaw
      .slice(0, 3)
      .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null);

    const comment = normalizeText(body.forecast_comment ?? "");

    const chartCount = Math.max(0, Math.min(3, charts.length));
    const chartH = 2.4;
    const spacing = 0.25;
    const chartW = chartCount > 0 ? (contentW - spacing * (chartCount - 1)) / chartCount : contentW;

    for (let i = 0; i < chartCount; i++) {
      const c = charts[i] ?? {};
      const title = String(c.title ?? `Chart${i + 1}`);

      const labelsRaw = Array.isArray(c.labels) ? c.labels : [];
      const valuesRaw = Array.isArray(c.values) ? c.values : [];

      const labels = labelsRaw.map((v: unknown) => String(v ?? ""));
      const values = valuesRaw.map((v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      });

      if (labels.length > values.length) values.push(...Array(labels.length - values.length).fill(0));
      if (values.length > labels.length) values.length = labels.length;

      const x = baseX + (chartW + spacing) * i;

      slide.addText(title, {
        x,
        y: startY - 0.35,
        w: chartW,
        h: 0.3,
        fontFace: "Meiryo UI",
        fontSize: 12,
        bold: true,
        color: "005AAA",
      });

      const maxLabelLen = Math.max(0, ...labels.map((l: string) => l.length));
      const rotate = maxLabelLen >= 8 ? 45 : 0;

      const data = [
        {
          name: "Value",
          labels,
          values,
        },
      ];

      slide.addChart(pptx.ChartType.bar, data, {
        x,
        y: startY,
        w: chartW,
        h: chartH,
        showLegend: false,
        showValue: true,
        dataLabelPosition: "outEnd",
        barDir: "col",
        chartColors: ["005AAA"],
        catAxisLabelRotation: rotate,
      });
    }

    const textY = startY + chartH + 0.35;
    const boxH = Math.max(1.2, footerY - textY - 0.1);

    slide.addShape("rect", {
      x: baseX,
      y: textY,
      w: contentW,
      h: boxH,
      fill: { color: "F0F0F0" },
      line: { color: "F0F0F0" },
    });

    slide.addText("■今後の見通し・リスク分析", {
      x: baseX + 0.2,
      y: textY + 0.15,
      w: contentW - 0.4,
      h: 0.3,
      fontFace: "Meiryo UI",
      fontSize: 16,
      bold: true,
      color: "005AAA",
    });

    slide.addText(comment, {
      x: baseX + 0.2,
      y: textY + 0.55,
      w: contentW - 0.4,
      h: boxH - 0.7,
      fontFace: "Meiryo UI",
      fontSize: 14,
      color: "000000",
      valign: "top",
    });

    return;
  }

  const text =
    "text" in body ? normalizeText((body as Record<string, unknown>).text) : normalizeText(safeStr(body, 2000));
  slide.addText(text, {
    x: baseX,
    y: startY,
    w: contentW,
    h: footerY - startY,
    fontFace: "Meiryo UI",
    fontSize: 14,
    color: "000000",
    valign: "top",
  });
}

type PptxGenCtor = new () => PptxGenLike;
type PptxGenImport = { default?: PptxGenCtor } & PptxGenCtor;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;

    const projectId = body.projectId ?? "dummy_projectId";

    if (!Array.isArray(body.slides) || body.slides.length === 0) {
      throw new Error("slides が配列ではない、または 0 件です");
    }

    // ✅ 動的 import（default/export両対応）
    const mod = (await import("pptxgenjs")) as unknown as PptxGenImport;
    const PptxGen: PptxGenCtor = mod.default ?? mod;

    // ✅ ここで “必要な機能を持つ” 型として扱う
    const pptx = new PptxGen();
    pptx.layout = "LAYOUT_WIDE";

    // 表紙（タイトルに projectName を使うなら、ここで差し替えもOK）
    addCoverSafe(pptx);

    // ✅ 本文：全スライド生成（ページネーション込み）
    const slidesAll = paginateSlides(body.slides, 7);

    // unknown type のログ（任意）
    slidesAll.forEach((s, idx) => {
      const ct = s.content_type;
      const known = new Set<SlideContentType>([
        "text_summary",
        "bullet_points",
        "issue_table",
        "issue_text",
        "table_and_text",
        "multi_chart_and_text",
        "text_simple",
      ]);
      if (ct && !known.has(ct)) {
        const bodyObj = typeof s.body === "object" && s.body !== null ? (s.body as Record<string, unknown>) : null;
        console.warn("⚠️ unknown content_type:", {
          idx,
          title: safeStr(s.title, 80),
          content_type: ct,
          bodyKeys: bodyObj ? Object.keys(bodyObj) : null,
        });
      }
    });

    // ✅ 本文スライド生成
    slidesAll.forEach((s, idx) => {
      const slide = pptx.addSlide();

      addHeaderFooter(slide, String(idx + 1));
      addPageTitle(slide, idx + 1, normalizeText(s.title ?? "No Title"));
      renderContent(pptx, slide, s);
    });

    const raw: PptxWriteResult = await pptx.write({ outputType: "nodebuffer" });

    const buf =
      raw instanceof Buffer
        ? raw
        : raw instanceof Uint8Array
        ? Buffer.from(raw)
        : Buffer.from(new Uint8Array(raw));

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="weekly_report_${projectId}.pptx"`,
      },
    });
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("❌ /api/report-pptx failed:", e.message);
      console.error(e.stack);

      return NextResponse.json({ error: e.message }, { status: 500 });
    }

    console.error("❌ /api/report-pptx failed:", e);

    return NextResponse.json({ error: "unknown error" }, { status: 500 });
  }
}
