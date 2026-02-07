"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

type SlideContent = {
  slide_id?: number;
  title: string;
  content_type: string;
  body: any;
};

type ThemeType = 'rpg' | 'serious';
type OnUpdateText = (path: string, val: string) => void;
type OnUpdateArray = (path: string, idx: number, val: any) => void;

interface SlideFrameProps {
  index: number;
  theme: ThemeType;
  slide: SlideContent;
  isEditMode?: boolean;
  onUpdateText?: OnUpdateText;
  onUpdateArray?: OnUpdateArray;
}

interface RenderSlideContentProps {
  theme: ThemeType;
  slide: SlideContent;
  isEditMode?: boolean;
  onUpdateText?: OnUpdateText;
  onUpdateArray?: OnUpdateArray;
}

interface IssueTableProps {
  body: any;
  isEditMode?: boolean;
  onUpdateArray?: OnUpdateArray;
  isRpg?: boolean;
}

interface EditableTextProps {
  value: string;
  path: string;
  className?: string;
}

export default function ReportPreviewPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<ThemeType>('rpg');

  // スライドを自動で適切なサイズに分割するユーティリティ
  const paginateSlides = (rawSlides: SlideContent[]): SlideContent[] => {
    const paginated: any[] = [];
    rawSlides.forEach(slide => {
      if (slide.content_type === 'issue_table') {
        const rows = slide.body.table_rows || [];
        const limit = 7; // 1ページあたりの最大行数
        if (rows.length > limit) {
          const pageCount = Math.ceil(rows.length / limit);
          for (let i = 0; i < pageCount; i++) {
            paginated.push({
              ...JSON.parse(JSON.stringify(slide)),
              slide_id: Date.now() + i,
              title: `${slide.title} (${i + 1}/${pageCount})`,
              body: { ...slide.body, table_rows: rows.slice(i * limit, (i + 1) * limit) }
            });
          }
          return;
        }
      } else if (slide.content_type === 'bullet_points') {
        const items = slide.body.items || [];
        const limit = 6;
        if (items.length > limit) {
          const pageCount = Math.ceil(items.length / limit);
          for (let i = 0; i < pageCount; i++) {
            paginated.push({
              ...JSON.parse(JSON.stringify(slide)),
              slide_id: Date.now() + i,
              title: pageCount > 1 ? `${slide.title} (${i + 1})` : slide.title,
              body: { ...slide.body, items: items.slice(i * limit, (i + 1) * limit) }
            });
          }
          return;
        }
      }
      paginated.push(slide);
    });
    return paginated;
  };

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/report-data?projectId=${projectId}`);
        const data = await res.json();
        if (data.progress_report) {
          const report = JSON.parse(data.progress_report);
          setSlides(paginateSlides(report.slides)); // Apply pagination here
          if (data.theme) setTheme(data.theme);
        }
      } catch (e) {
        console.error("Failed to fetch report:", e);
      } finally {
        setLoading(false);
      }
    }
    if (projectId) fetchReport();
  }, [projectId]);

  const handleUpdateText = (slideIdx: number, path: string, value: string) => {
    const newSlides = [...slides];
    const keys = path.split('.');
    let current: any = newSlides[slideIdx];
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setSlides(newSlides);
  };

  const handleUpdateArray = (slideIdx: number, path: string, itemIdx: number, value: any) => {
    const newSlides = [...slides];
    const keys = path.split('.');
    let current: any = newSlides[slideIdx];
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]][itemIdx] = value;
    setSlides(newSlides);
  };

  const handleAddSlide = (idx: number) => {
    const newSlides = [...slides];
    newSlides.splice(idx + 1, 0, {
      slide_id: Date.now(),
      title: "新規スライド",
      content_type: "text_summary",
      body: { status_label: "🟢 順調", summary_text: "ここに内容を入力...", key_points: [] }
    });
    setSlides(newSlides);
  };

  const handleDuplicateSlide = (idx: number) => {
    const newSlides = [...slides];
    const copy = JSON.parse(JSON.stringify(newSlides[idx]));
    copy.slide_id = Date.now();
    copy.title += " (コピー)";
    newSlides.splice(idx + 1, 0, copy);
    setSlides(newSlides);
  };

  const handleSplitSlide = (idx: number) => {
    const slide = slides[idx] as SlideContent;
    const newSlides = [...slides];

    if (slide.content_type === 'issue_table' || slide.content_type === 'issue_text' || slide.content_type === 'table_and_text') {
      const rows = slide.body.table_rows || [];
      if (rows.length <= 1) {
        alert("分割できるデータがありません（1行以下です）");
        return;
      }
      const mid = Math.ceil(rows.length / 2);
      const firstHalf = rows.slice(0, mid);
      const secondHalf = rows.slice(mid);

      // 元のスライドを(1)にする
      newSlides[idx] = {
        ...slide,
        title: slide.title.includes("(1)") ? slide.title : `${slide.title} (1)`,
        body: { ...slide.body, table_rows: firstHalf }
      };
      // 新しいスライド(2)を挿入
      newSlides.splice(idx + 1, 0, {
        ...JSON.parse(JSON.stringify(slide)),
        slide_id: Date.now(),
        title: slide.title.includes("(1)") ? slide.title.replace("(1)", "(2)") : `${slide.title} (2)`,
        body: { ...slide.body, table_rows: secondHalf }
      });
      setSlides(newSlides);
    } else if (slide.content_type === 'bullet_points') {
      const items = slide.body.items || [];
      if (items.length <= 1) return;
      const mid = Math.ceil(items.length / 2);
      newSlides[idx].body.items = items.slice(0, mid);
      newSlides.splice(idx + 1, 0, {
        ...JSON.parse(JSON.stringify(slide)),
        slide_id: Date.now(),
        body: { ...slide.body, items: items.slice(mid) }
      });
      setSlides(newSlides);
    } else {
      alert("このスライド形式は自動分割に対応していません。複製して手動で調整してください。");
    }
  };

  const handleDeleteSlide = (idx: number) => {
    if (window.confirm("このスライドを削除しますか？")) {
      const newSlides = [...slides];
      newSlides.splice(idx, 1);
      setSlides(newSlides);
    }
  };

  const saveAndExport = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/report-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, slides, theme })
      });

      const res = await fetch('/api/report-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Quest_Report_Final_${theme}_${projectId}.pdf`;
        a.click();
      }
    } catch (e) {
      alert("保存・出力に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-white">Loading Quest Report...</div>;

  return (
    <div className={`${theme === 'rpg' ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'} min-h-screen pb-20 transition-colors duration-500`}>
      {/* 操作バー */}
      <div className="fixed top-0 inset-x-0 z-50 bg-black/80 backdrop-blur-md border-b border-[#8A4B26] p-4 flex justify-between items-center print:hidden shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-white/60 hover:text-white">← 戻る</button>
          <h2 className="text-white font-bold ml-4 text-xs lg:text-base">📜 報告書エディター</h2>
        </div>

        <div className="flex bg-white/10 rounded-lg p-1 border border-white/20">
          <button onClick={() => setTheme('rpg')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${theme === 'rpg' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>⚔️ RPG</button>
          <button onClick={() => setTheme('serious')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${theme === 'serious' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>💼 ビジネス</button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setIsEditMode(!isEditMode)} className={`px-4 py-2 rounded text-xs font-bold transition ${isEditMode ? 'bg-[#8A4B26] text-white' : 'bg-white/10 text-white/60'}`}>{isEditMode ? "✍️ 編集モード" : "👁️ 閲覧モード"}</button>
          <button onClick={saveAndExport} disabled={isSaving} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-full text-xs font-bold shadow-lg hover:scale-105 transition disabled:opacity-50">{isSaving ? "🔮 生成中..." : "💎 保存してPDF出力"}</button>
        </div>
      </div>

      <div className="pt-24 space-y-10 print:pt-0 print:space-y-0 print:m-0 print:p-0">
        {/* 1. 表紙 (Cover) */}
        <SlideFrame key="cover" index={-2} theme={theme} slide={{ title: "表紙", content_type: "cover", body: { projectName: projectId } }} />

        {/* 2. 目次 (TOC) - 5行2段(10項目)を超えるなら自動改ページ */}
        {(() => {
          const items = slides.map(s => s.title);
          const limit = 10;
          const chunks = [];
          for (let i = 0; i < items.length; i += limit) {
            chunks.push(items.slice(i, i + limit));
          }
          return chunks.map((chunk, i) => (
            <SlideFrame
              key={`toc-${i}`}
              index={-1}
              theme={theme}
              slide={{
                title: chunks.length > 1 ? `目次 (${i + 1}/${chunks.length})` : "目次",
                content_type: "toc",
                body: { items: chunk, startIndex: i * limit }
              }}
            />
          ));
        })()}

        {/* 3. 本文 (AI Slides) */}
        {slides.map((slide, index) => (
          <div key={index} className="relative print:m-0 print:p-0 print:border-none">
            {/* 常に表示されるスライド操作バー (編集モード時のみ) */}
            {isEditMode && (
              <div className="flex items-center justify-between mb-2 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-t-lg border-x border-t border-white/10 print:hidden mx-auto w-[1280px]">
                <div className="flex items-center gap-3">
                  <span className="bg-[#8A4B26] text-white text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">Slide {String(index + 1).padStart(2, '0')}</span>
                  <span className="text-white/40 text-[10px] font-bold uppercase">{slide.content_type}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAddSlide(index)} className="px-3 py-1 bg-green-600/80 hover:bg-green-600 text-white rounded text-[10px] font-black transition-all flex items-center gap-1 shadow-sm">
                    <span>＋</span> 後に追加
                  </button>
                  <button onClick={() => handleDuplicateSlide(index)} className="px-3 py-1 bg-blue-600/80 hover:bg-blue-600 text-white rounded text-[10px] font-black transition-all flex items-center gap-1 shadow-sm">
                    <span>❐</span> コピー
                  </button>
                  <button onClick={() => handleSplitSlide(index)} className="px-3 py-1 bg-amber-500/80 hover:bg-amber-500 text-white rounded text-[10px] font-black transition-all flex items-center gap-1 shadow-sm">
                    <span>✂️</span> 長すぎる内容を分割
                  </button>
                  <button onClick={() => handleDeleteSlide(index)} className="px-3 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded text-[10px] font-black transition-all flex items-center gap-1 shadow-sm">
                    <span>×</span> 削除
                  </button>
                </div>
              </div>
            )}

            <SlideFrame
              index={index}
              theme={theme}
              slide={slide}
              isEditMode={isEditMode}
              onUpdateText={(path: string, val: string) => handleUpdateText(index, path, val)}
              onUpdateArray={(path: string, idx: number, val: any) => handleUpdateArray(index, path, idx, val)}
            />
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          .print\:hidden { display: none !important; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 1280px;
            height: 720px;
            overflow: visible !important;
          }
          .slide-container {
            margin: 0 !important;
            page-break-after: always;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact;
            width: 1280px !important;
            height: 720px !important;
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            overflow: hidden !important;
          }
        }
      `}</style>
    </div>
  );
}

function SlideFrame({ index, theme, slide, isEditMode, onUpdateText, onUpdateArray }: SlideFrameProps) {
  const isCover = slide.content_type === 'cover';
  const isToc = slide.content_type === 'toc';
  const isRpg = theme === 'rpg';
  const [hasOverflow, setHasOverflow] = useState(false);

  // 見切れチェックのロジック
  useEffect(() => {
    const checkOverflow = () => {
      const el = document.getElementById(`slide-content-${index}`);
      if (el) {
        const isOverflowing = el.scrollHeight > el.clientHeight;
        setHasOverflow(isOverflowing);
      }
    };

    checkOverflow();
    // 編集による変化を検知するため、定期的に、または編集後に実行
    const timer = setInterval(checkOverflow, 1000);
    return () => clearInterval(timer);
  }, [index, slide]);

  if (isRpg) {
    return (
      <div className={`slide-container relative w-[1280px] h-[720px] ${isCover ? 'bg-[#000510]' : 'bg-[#020617]'} overflow-hidden mx-auto shadow-[0_0_50px_rgba(138,75,38,0.3)] border-2 ${hasOverflow ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'border-white/5'} transition-all duration-300`}>
        {/* 見切れ警告バッジ */}
        {hasOverflow && isEditMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-4 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg print:hidden">
            ⚠️ 文字が見切れています！ 内容を削ってください
          </div>
        )}

        <div className={`absolute inset-0 ${isCover ? 'opacity-30' : 'opacity-10'}`}>
          <Image src="/images/knight.jpg" alt="bg" fill className="object-cover grayscale" />
        </div>

        {/* 飾り枠 */}
        {!isCover && (
          <>
            <div className="absolute inset-0 pointer-events-none border-[12px] border-[#3F2A1A] m-2 opacity-60"></div>
            <div className="absolute inset-0 pointer-events-none border-[1px] border-[#8A4B26] m-10"></div>
          </>
        )}

        <div className="relative z-10 p-20 flex flex-col h-full">
          {isCover ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-10 animate-in zoom-in duration-1000">
              <div className="text-[#8A4B26] font-bold tracking-[1em] uppercase text-2xl opacity-80 mb-4">Quest Start</div>
              <h1 className="text-8xl font-black bg-gradient-to-b from-white via-white to-[#D4A373] bg-clip-text text-transparent italic drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] leading-[1.2]">
                週次進捗報告書
              </h1>
              <div className="h-1 w-64 bg-gradient-to-r from-transparent via-[#8A4B26] to-transparent"></div>
              <div className="space-y-4">
                <div className="text-3xl text-white font-bold tracking-widest">{slide.body.projectName}</div>
                <div className="text-[#D4A373] text-xl font-mono uppercase tracking-[0.5em]">{new Date().toLocaleDateString('ja-JP')}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-10 flex items-center justify-between border-b-2 border-[#8A4B26]/50 pb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-[#8A4B26] text-white px-4 py-1 text-xl font-bold rounded shadow-inner">
                    {isToc ? "TOC" : `P.${String(index + 1).padStart(2, '0')}`}
                  </div>
                  <h1
                    contentEditable={isEditMode && !isToc} suppressContentEditableWarning
                    onBlur={(e) => onUpdateText?.('title', e.currentTarget.textContent || "")}
                    className={`text-4xl font-bold bg-gradient-to-r from-white via-white to-[#D4A373] bg-clip-text text-transparent italic ${isEditMode && !isToc ? 'outline-dashed outline-1 outline-[#8A4B26] px-2' : ''}`}
                  >
                    {isToc ? "目次 (Adventure Log)" : slide.title}
                  </h1>
                </div>
                <div className="text-[#8A4B26] font-bold text-lg tracking-widest opacity-80 uppercase font-mono">Quest Progress Report</div>
              </div>
              <div id={`slide-content-${index}`} className="flex-1 overflow-hidden print:overflow-visible">
                <RenderSlideContent theme={theme} slide={slide} isEditMode={isEditMode} onUpdateText={onUpdateText} onUpdateArray={onUpdateArray} />
              </div>
            </>
          )}
          <div className="mt-auto flex justify-between items-end text-[#8A4B26] text-sm font-mono opacity-50">
            <div>© 2026 CTC FINANCIAL SERVICES GROUP</div>
            <div>RECORDED BY ELDER GUILD OFFICE</div>
          </div>
        </div>
      </div>
    );
  } else {
    // 真面目風テンプレート
    return (
      <div className={`slide-container relative w-[1280px] h-[720px] bg-white overflow-hidden mx-auto shadow-2xl border-2 ${hasOverflow ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'border-gray-200'} transition-all duration-300`}>
        {/* 見切れ警告バッジ */}
        {hasOverflow && isEditMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-4 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg print:hidden">
            ⚠️ 枠外にはみ出しています
          </div>
        )}

        <div className="absolute top-0 right-0 w-[40%] h-[120%] bg-[#005AAA] -skew-x-12 translate-x-32 -translate-y-10 opacity-5"></div>
        <div className="relative z-10 p-16 flex flex-col h-full">
          {isCover ? (
            <div className="flex flex-col justify-center h-full space-y-12 pl-10 border-l-[20px] border-[#005AAA]">
              <div className="space-y-2">
                <div className="text-[#005AAA] font-black text-2xl tracking-tighter">CTC Financial Services Group</div>
                <div className="text-gray-400 text-sm font-bold uppercase tracking-widest font-mono">Confidential / Internal Use Only</div>
              </div>
              <div className="space-y-4">
                <div className="text-gray-500 font-bold text-2xl">Weekly Progress Report</div>
                <h1 className="text-7xl font-bold text-slate-900 leading-tight">
                  {slide.body.projectName}
                </h1>
              </div>
              <div className="pt-10 space-y-2 text-slate-500 font-bold">
                <div>報告日: {new Date().toLocaleDateString('ja-JP')}</div>
                <div>作成者: Project Quest System</div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8 flex items-end justify-between border-b-4 border-[#005AAA] pb-4">
                <div className="flex items-center gap-6">
                  <div className="text-[#005AAA] text-4xl font-black font-serif italic">
                    {isToc ? "TOC" : `P.${String(index + 1).padStart(2, '0')}`}
                  </div>
                  <h1
                    contentEditable={isEditMode && !isToc} suppressContentEditableWarning
                    onBlur={(e) => onUpdateText?.('title', e.currentTarget.textContent || "")}
                    className={`text-4xl font-bold text-slate-800 ${isEditMode && !isToc ? 'outline-dashed outline-1 outline-blue-400 px-2' : ''}`}
                  >
                    {isToc ? "本日の報告内容" : slide.title}
                  </h1>
                </div>
                <div className="text-right">
                  <div className="text-[#005AAA] font-black text-xl tracking-tighter">CTC</div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest font-mono">Financial Services Group</div>
                </div>
              </div>
              <div id={`slide-content-${index}`} className="flex-1 overflow-hidden print:overflow-visible text-slate-700">
                <RenderSlideContent theme={theme} slide={slide} isEditMode={isEditMode} onUpdateText={onUpdateText} onUpdateArray={onUpdateArray} />
              </div>
            </>
          )}
          <div className="mt-auto flex justify-between items-center text-gray-400 text-xs font-sans pt-4 border-t border-gray-100">
            <div className="flex gap-4">
              <span>CONFIDENTIAL</span>
              <span>© 2026 CTC Financial Services Group</span>
            </div>
            <div className="text-[#005AAA] font-bold font-mono text-[10px] tracking-widest">PROGRESS REPORT SYSTEM</div>
          </div>
        </div>
      </div>
    );
  }
}

function RenderSlideContent({ theme, slide, isEditMode, onUpdateText, onUpdateArray }: RenderSlideContentProps) {
  const { content_type, body } = slide;
  const isRpg = theme === 'rpg';

  const EditableText = ({ value, path, className = "" }: EditableTextProps) => (
    <div
      contentEditable={isEditMode}
      suppressContentEditableWarning
      onBlur={(e) => onUpdateText?.(path, e.currentTarget.textContent || "")}
      className={`${className} ${isEditMode ? `outline-dashed outline-1 ${isRpg ? 'outline-[#8A4B26]/50 bg-white/5' : 'outline-blue-300 bg-blue-50/50'} px-1` : ''}`}
    >
      {value}
    </div>
  );

  switch (content_type) {
    case "cover":
      return null; // Cover is handled in SlideFrame
    case "toc":
      const startIndex = body.startIndex || 0;
      return (
        <div className="h-full py-10 px-10">
          <div className="grid grid-cols-2 gap-x-20 gap-y-8">
            {body.items?.map((item: string, i: number) => (
              <div key={i} className={`flex items-baseline gap-4 border-b pb-4 ${isRpg ? 'border-[#8A4B26]/20' : 'border-slate-100'}`}>
                <span className={`${isRpg ? 'text-[#8A4B26]' : 'text-[#005AAA]'} font-bold font-mono text-2xl`}>
                  {String(startIndex + i + 1).padStart(2, '0')}
                </span>
                <span className={`text-2xl font-bold ${isRpg ? 'text-white/80' : 'text-slate-800'}`}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    case "text_summary":
      return (
        <div className="space-y-4 h-full flex flex-col justify-center">
          <div className={`${isRpg ? 'bg-white/5 border-l-8 border-[#FF6400]' : 'bg-slate-50 border-l-8 border-[#005AAA]'} p-5 rounded-r-lg shadow-sm w-full`}>
            <div className={`${isRpg ? 'text-[#FF6400]' : 'text-[#005AAA]'} text-[10px] font-black mb-2 uppercase tracking-widest flex justify-between`}>
              <span>Comprehensive Status Report</span>
              <EditableText value={body.status_label} path="body.status_label" className="text-right font-black" />
            </div>
            <div className={`text-2xl leading-snug font-medium ${isRpg ? 'text-white' : 'text-slate-800'}`}>
              <EditableText value={body.summary_text} path="body.summary_text" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 pl-4 pt-2">
            {body.key_points?.map((p: string, i: number) => (
              <div key={i} className={`flex items-start gap-4 text-lg ${isRpg ? 'text-[#D4A373]' : 'text-slate-600'}`}>
                {isRpg ? (
                  <span className="w-2.5 h-2.5 bg-[#D4A373] rotate-45 shrink-0 mt-2"></span>
                ) : (
                  <span className="w-2 h-2 bg-[#005AAA] rounded-full shrink-0 mt-2"></span>
                )}
                <div
                  contentEditable={isEditMode} suppressContentEditableWarning
                  onBlur={(e) => onUpdateArray?.('body.key_points', i, e.currentTarget.textContent || "")}
                  className={`flex-1 leading-tight ${isEditMode ? 'bg-white/5 outline-dashed outline-1 opacity-80' : ''}`}
                >
                  {p}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "bullet_points":
      return (
        <ul className="space-y-6 pt-4">
          {body.items?.map((item: string, i: number) => (
            <li key={i} className={`flex gap-4 text-2xl ${isRpg ? 'text-white/90' : 'text-slate-700'}`}>
              <span className={`${isRpg ? 'text-[#8A4B26]' : 'text-[#005AAA]'} mt-1 shrink-0`}>{isRpg ? '▶' : '■'}</span>
              <div
                contentEditable={isEditMode} suppressContentEditableWarning
                onBlur={(e) => onUpdateArray?.('body.items', i, e.currentTarget.textContent || "")}
                className={`flex-1 ${isEditMode ? 'bg-white/5 outline-dashed outline-1' : ''}`}
              >
                {item}
              </div>
            </li>
          ))}
        </ul>
      );

    case "issue_table":
      return (
        <div className="space-y-4 pt-4 h-full print:!block print:!h-auto print:!overflow-visible z-20 relative">
          <IssueTable body={body} isEditMode={isEditMode} onUpdateArray={onUpdateArray} isRpg={isRpg} />
        </div>
      );

    case "issue_text":
    case "table_and_text":
      return (
        <div className="grid grid-cols-2 gap-8 h-full pt-4">
          <div className="space-y-3 overflow-hidden">
            <div className={`${isRpg ? 'text-[#D4A373]' : 'text-slate-500'} text-[10px] font-black uppercase tracking-widest mb-1`}>
              <span>Critical Issue Data</span>
            </div>
            {/* 1課題1スライドを原則とするため、最初の1件を表示 */}
            <div className={`overflow-hidden border rounded mb-2 ${isRpg ? 'border-[#8A4B26]/30 bg-white/5' : 'border-slate-100 bg-slate-50/30'}`}>
              <table className="w-full text-xs">
                <tbody>
                  {body.table_headers?.map((h: string, i: number) => (
                    <tr key={i} className={`border-b last:border-0 ${isRpg ? 'border-[#8A4B26]/10' : 'border-slate-100'}`}>
                      <th className={`p-2 w-1/3 font-bold text-left ${isRpg ? 'bg-[#8A4B26]/20 text-[#D4A373]' : 'bg-slate-100/50 text-slate-500'}`}>{h}</th>
                      <td className={`p-2 ${isRpg ? 'text-white' : 'text-slate-700 font-bold'}`}>
                        <div
                          contentEditable={isEditMode} suppressContentEditableWarning
                          onBlur={(e) => {
                            const newRows = [...(body.table_rows || [[]])];
                            if (!newRows[0]) newRows[0] = [];
                            newRows[0][i] = e.currentTarget.textContent || "";
                            onUpdateArray?.('body.table_rows', 0, newRows[0]);
                          }}
                          className={isEditMode ? 'bg-white/5 outline-dashed outline-1' : ''}
                        >
                          {body.table_rows?.[0]?.[i]}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`p-3 rounded border ${isRpg ? 'bg-amber-900/10 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-100 text-amber-800'} text-[10px] italic`}>
              ⚠ この課題はプロジェクトのクリティカルパスに影響します。早急な対応が必要です。
            </div>
          </div>
          <div className={`p-8 rounded-xl h-full flex flex-col border ${isRpg ? 'bg-[#3F2A1A]/30 border-[#8A4B26]/50' : 'bg-slate-50 border-slate-200 shadow-inner'}`}>
            <div className={`${isRpg ? 'text-[#FF6400]' : 'text-[#005AAA]'} font-black text-xs mb-4 flex items-center gap-2 uppercase tracking-tighter`}>
              ▼ 背景・分析・対策案
            </div>
            <div className={`flex-1 overflow-y-auto scrollbar-hide text-lg leading-relaxed whitespace-pre-wrap ${isRpg ? 'text-white/90' : 'text-slate-700 font-medium'}`}>
              <EditableText value={body.critical_issue_analysis || body.analysis_text} path={body.critical_issue_analysis ? "body.critical_issue_analysis" : "body.analysis_text"} />
            </div>
          </div>
        </div>
      );

    case "multi_chart_and_text":
      return (
        <div className="grid grid-cols-2 gap-8 h-full pt-4">
          <div className="space-y-4 overflow-y-auto scrollbar-hide pr-2">
            {body.charts?.map((chart: any, i: number) => (
              <div key={i} className={`p-4 rounded-lg border ${isRpg ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm'}`}>
                <EditableText value={chart.title} path={`body.charts.${i}.title`} className={`text-[10px] mb-3 font-black uppercase tracking-widest ${isRpg ? 'text-[#8A4B26]' : 'text-slate-500'}`} />
                <div className="flex flex-col gap-3">
                  {chart.labels?.map((l: string, j: number) => (
                    <div key={j} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center px-1 font-bold">
                        <EditableText value={l} path={`body.charts.${i}.labels.${j}`} className={`text-[9px] ${isRpg ? 'text-white/50' : 'text-slate-400'}`} />
                        <EditableText value={String(chart.values[j])} path={`body.charts.${i}.values.${j}`} className={`text-[10px] ${isRpg ? 'text-white' : 'text-[#005AAA]'}`} />
                      </div>
                      <div className={`h-1.5 rounded-full relative overflow-hidden ${isRpg ? 'bg-black/40 border border-white/5' : 'bg-slate-100'}`}>
                        <div className={`h-full transition-all duration-1000 ${isRpg ? 'bg-gradient-to-r from-blue-700 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-[#005AAA]'}`} style={{ width: `${(Number(chart.values[j]) / Math.max(1, ...chart.values.map(Number))) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className={`p-8 rounded-xl h-full flex flex-col border transition-all duration-500 ${isRpg ? 'bg-gradient-to-br from-[#1a110a] to-[#3F2A1A] border-[#8A4B26]/50 shadow-[0_0_30px_rgba(138,75,38,0.2)]' : 'bg-white border-blue-100 shadow-xl shadow-blue-900/5'}`}>
            <div className={`${isRpg ? 'text-[#FF6400]' : 'text-[#005AAA]'} font-black mb-6 flex items-center gap-3 uppercase text-sm tracking-widest`}>
              <div className={`w-1.5 h-6 rounded-full shadow-lg ${isRpg ? 'bg-[#FF6400]' : 'bg-[#005AAA]'}`}></div>
              {isRpg ? "預言・今後の見通し" : "今後の見通し・リスク分析"}
            </div>
            <div className={`flex-1 overflow-y-auto scrollbar-hide text-base leading-relaxed ${isRpg ? 'text-white/90 italic' : 'text-slate-700 font-medium'}`}>
              <EditableText value={body.forecast_comment} path="body.forecast_comment" className="leading-loose" />
            </div>
            {isRpg && <div className="mt-4 text-[10px] text-[#8A4B26] font-mono tracking-tighter self-end opacity-50">SCRIBED BY GUILD SEERS</div>}
          </div>
        </div>
      );

    default:
      // AIが想定外のJSON階層を作ったり、文字列の中にさらにJSONを閉じ込めた場合でも、
      // 徹底的に「純粋な日本語メッセージ」だけを抽出する
      const smartExtractText = (val: any): string => {
        if (!val) return "";
        if (typeof val === 'string') {
          // もし文字列がJSONっぽければ( { で始まるなど)、パースを試みる
          if (val.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(val);
              return smartExtractText(parsed);
            } catch (e) { /* ignore */ }
          }
          return val.replace(/\\n/g, '\n').replace(/["{}]/g, '').trim();
        }
        if (Array.isArray(val)) return val.map(v => smartExtractText(v)).join(' ');
        if (typeof val === 'object') {
          const priorityKeys = ['text', 'summary_text', 'summary', 'description', 'message', 'body', 'content'];
          for (const key of priorityKeys) {
            if (val[key]) return smartExtractText(val[key]);
          }
          // 最初に見つかった文字列を返す
          const firstVal = Object.values(val).find(v => typeof v === 'string' || typeof v === 'object');
          return smartExtractText(firstVal);
        }
        return String(val);
      };

      const items = body?.items || (Array.isArray(body) ? body : null);
      const cleanText = smartExtractText(body);

      if (items && Array.isArray(items)) {
        return (
          <ul className="space-y-6 pt-10">
            {items.slice(0, 8).map((item: any, i: number) => (
              <li key={i} className={`flex gap-4 text-2xl ${isRpg ? 'text-white/90' : 'text-slate-700'}`}>
                <span className={`${isRpg ? 'text-[#FF6400]' : 'text-[#005AAA]'} mt-1 shrink-0`}>{isRpg ? '✦' : '■'}</span>
                <div className="flex-1 leading-snug">{smartExtractText(item)}</div>
              </li>
            ))}
          </ul>
        );
      }

      return (
        <div className="space-y-6 h-full flex flex-col justify-center">
          <div className={`${isRpg ? 'bg-white/5 border-l-8 border-[#FF6400]' : 'bg-slate-50 border-l-8 border-[#005AAA]'} p-8 rounded-r-lg shadow-sm w-full transition-all`}>
            <div className={`${isRpg ? 'text-[#FF6400]' : 'text-[#005AAA]'} text-[10px] font-black mb-4 uppercase tracking-widest`}>
              <span>Supplementary Information</span>
            </div>
            <div className={`text-2xl leading-relaxed font-medium whitespace-pre-wrap ${isRpg ? 'text-white' : 'text-slate-800'}`}>
              <EditableText
                value={cleanText || "詳細事項を確認中です。"}
                path="body"
              />
            </div>
          </div>
          {isRpg && (
            <div className={`p-4 rounded border border-amber-900/20 bg-amber-900/5 text-[#D4A373] text-[10px] italic`}>
              ※ このページは追加の文脈を補足するためのアーカイブ記録です。
            </div>
          )}
        </div>
      );
  }
}

function IssueTable({ body, isEditMode, onUpdateArray, isRpg }: IssueTableProps) {
  return (
    <div className={`overflow-hidden border rounded-lg shadow-xl backdrop-blur-sm print:shadow-none print:backdrop-filter-none ${isRpg ? 'border-[#8A4B26]/40 bg-white/5 print:bg-transparent' : 'border-slate-200 bg-white print:bg-transparent'}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className={`${isRpg ? 'bg-[#8A4B26]/20 text-[#D4A373]' : 'bg-slate-100 text-slate-800'} text-[10px] uppercase tracking-widest`}>
            {body.table_headers?.map((h: string, i: number) => (
              <th key={i} className="p-4 border-b font-bold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.table_rows?.map((row: any[], i: number) => (
            <tr key={i} className={`hover:bg-white/5 transition-colors border-b last:border-0 ${isRpg ? 'border-[#8A4B26]/10' : 'border-slate-100'}`}>
              {row.map((cell, j) => (
                <td key={j} className={`p-4 text-sm whitespace-pre-wrap ${isRpg ? 'text-white/80' : 'text-slate-700'}`}>
                  <div
                    contentEditable={isEditMode}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newRow = [...row];
                      newRow[j] = e.currentTarget.textContent || "";
                      onUpdateArray?.('body.table_rows', i, newRow);
                    }}
                    className={`${isEditMode ? 'bg-white/5 outline-dashed outline-1 outline-[#8A4B26]/20' : ''}`}
                  >
                    {String(cell)}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
