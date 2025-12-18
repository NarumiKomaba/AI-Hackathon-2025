"use client";

import { useRef, useState, Suspense, type ChangeEvent, type DragEvent} from "react";
import ProjectQuestLayout from "@/components/layout/ProjectQuestLayout";
import { useSearchParams, useRouter } from "next/navigation";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import * as XLSX from 'xlsx';
import { setMaxIdleHTTPParsers } from "http";
import {
  getFirebaseStorage,
  getFirebaseFirestore,
} from "@/lib/firebaseClient";
import { collection, addDoc, serverTimestamp, writeBatch, doc } from "firebase/firestore";
import { Timestamp } from "firebase-admin/firestore";

type Quest = {
  id: string;
  title: string;
  recommendedLevel: number;
  elapsedDays: number;
};

const MOCK_QUESTS: Quest[] = [
  { id: "core-system", title: "基幹システム刷新 編", recommendedLevel: 36, elapsedDays: 120 },
  { id: "sales-ui", title: "営業支援アプリ UI 改修", recommendedLevel: 18, elapsedDays: 45 },
  { id: "onprem-llm", title: "オンプレ LLM 検証クエスト", recommendedLevel: 24, elapsedDays: 60 },
];

// Excelの各行の構造を定義
interface WbsRow {
  "No": string;
  "サブシス": string;
  "工程": string; // 任意項目（空の可能性がある場合）
  "機能分類": string;
  "機能": string;
  "備考":string;
  "予定開始日": string;
  "予定終了日": string;
  "実績開始日": string;
  "実績終了日": string;
  "ステータス": string;
  "状況": string;
  "担当者名": string;
}

function GuildSubmitPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const questIdFromQuery = searchParams.get("questId");
  const [selectedQuestId, setSelectedQuestId] = useState(
    questIdFromQuery ?? MOCK_QUESTS[0].id
  );
  const [fileName, setFileName] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedQuest =
    MOCK_QUESTS.find((q) => q.id === selectedQuestId) ?? MOCK_QUESTS[0];

  // // ファイル設定を共通化（クリック/ドロップ両方から呼ぶ）
  // const applySelectedFiles = (files: FileList | File[] | null) => {
  //   if (!files || files.length === 0) {
  //     setSelectedFiles([]);
  //   } else {
  //     const arr = Array.from(files);
  //     setSelectedFiles(arr);
  //   }
  //   setMessage("");
  // };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const files = e.target.files;
    if (file) setFileName(file.name);
    if (!files || files.length === 0) {
      setSelectedFiles([]);
    } else {
      const arr = Array.from(files);
      setSelectedFiles(arr);
    }

  };

  // const handleSubmit = () => alert("提出");
  const handleSubmit = async() => {
    if (fileName.length === 0) {
      alert("ファイルを選択してください。");
      return;
    }

    setUploading(true);
    setMessage("");
    alert("ファイル名：「" +fileName+ "」を提出しますか？");

     try {

      for (const [index, file] of selectedFiles.entries()){

        // 1. ファイルをArrayBufferとして読み込み
      const data = await file.arrayBuffer();

      // 2. Excelデータの解析
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0]; // 最初のシートを対象
      const sheet = workbook.Sheets[sheetName];

      // 3. JSONに変換（ヘッダー行がある前提）
      const jsonData = XLSX.utils.sheet_to_json<WbsRow>(sheet);

      // 3. 後続の処理も型安全に
      await saveToFirestore(jsonData, file.name);

      alert("成功しました");
      }
    } catch (err) {
      console.error("handleCreateQuestDraft error:", err);
      setMessage("資料のアップロードに失敗しました...");
    } finally {
      setUploading(false);
    }
  };

  const saveToFirestore = async (data: WbsRow[], fileName: string) => {

    const storage = getFirebaseStorage();
    const db = getFirebaseFirestore();
    const batch = writeBatch(db);
    const collectionRef = collection(db, "wbs_items");

    data.forEach((item) => {
      // item.名前 のように、入力補完（IntelliSense）が効くようになります
      const docData = {
        projectId: selectedQuestId,
        number: item["No"] || 0,
        subSystem: item["サブシス"] || "不明",
        phase: item["工程"] || "不明", // 任意項目（空の可能性がある場合）
        category: item["機能分類"] || "不明",
        feature: item["機能"] || "不明",
        description:item["備考"] || "不明",
        parent_no: null,
        level: 1,
        plan_start_date: serverTimestamp(),
        plan_end_date: serverTimestamp(),
        actual_start_date: serverTimestamp(),
        actual_end_date: serverTimestamp(),
        status: item["ステータス"] || "不明",
        progress_ratio: item["状況"] || "不明",
        assignee: item["担当者名"] || "不明",
        snapshot_date: serverTimestamp(),
        source_file_name: fileName,
        imported_at: serverTimestamp(),
      };
      const newDocRef = doc(collectionRef);
      batch.set(newDocRef, docData);
    });
    await batch.commit();
  };



  const [isReporting, setIsReporting] = useState(false);
  const [reportSummary, setReportSummary] = useState("");
  const [reportError, setReportError] = useState("");

  const handleCreateReport = async () => {
    const projectId = "dummy_projectId";

    // ★ 前回の結果をリセット
    setReportError("");
    setReportSummary("");
    setIsReporting(true); // ★ loading開始

    try {
      // 1) slides JSON を生成
      const r1 = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });

      if (!r1.ok) {
        const text = await r1.text();
        console.error("report API error:", r1.status, text);
        throw new Error("report API error");
      }

      const j1 = await r1.json();
      const slides = j1.slides;

      if (j1.summary) {
        setReportSummary(j1.summary);
      }

      // 2) PPTX を生成
      const r2 = await fetch("/api/report-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, slides }),
      });

      if (!r2.ok) {
        const text = await r2.text();
        console.error("report-pptx API error:", r2.status, text);
        throw new Error("report-pptx API error");
      }

      const blob = await r2.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `weekly_report_${projectId}.pptx`;
      a.click();
      URL.revokeObjectURL(url);

      // ★ ローディング後に別ページへ遷移
      router.push(`/quests`);
    } catch (e) {
      console.error("handleCreateReport error:", e);
      setReportError("報告書の作成に失敗しました…");
    } finally {
      setIsReporting(false); // ★ loading終了
    }
  };
  

  return (
    <ProjectQuestLayout>
      {/* ★ 報告書作成中だけ loading 動画を表示 */}
      <LoadingOverlay show={isReporting} />

      <div className="h-full px-8 py-6">
        {/* 全体：上下分割（上：内容、下：大ボタン） */}
        <div className="h-full flex flex-col gap-8">
          {/* 上段：左右分割 */}
          <div className="flex-1 flex gap-10 min-h-0">
            {/* 左：提出フォーム */}
            <section className="flex-1 flex flex-col gap-6 min-h-0">
              {/* クエスト名 */}
              <div>
                <div className="text-sm font-semibold mb-2 text-[#3b2a1a]">
                  クエスト名
                </div>
                <div className="bg-[#6B4B2A] rounded-md px-4 py-3 text-white text-sm">
                  {selectedQuest.title}
                  <span className="ml-3 text-xs opacity-90">
                    推奨Lv{selectedQuest.recommendedLevel} / 経過{selectedQuest.elapsedDays}日
                  </span>
                </div>
              </div>

              {/* ファイルアップロード */}
              <div>
                <div className="text-sm font-semibold mb-2 text-[#3b2a1a]">
                  ファイルアップロード
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-100 rounded-md px-4 py-3 text-sm text-gray-600 truncate">
                    {fileName || "ファイル名************"}
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0"
                    aria-label="アップロード"
                  >
                    <img
                      src="/images/up-blue.png"
                      alt="アップロード"
                      className="h-16 w-auto select-none cursor-pointer"
                      draggable={false}
                    />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {selectedFiles.length > 0 && (
                  <div className="mt-3 text-left max-h-24 overflow-y-auto text-[11px] text-gray-800">
                    <p className="font-semibold mb-1">
                      選択中: {selectedFiles.length} ファイル
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {selectedFiles.map((file) => (
                        <li key={file.name}>
                          {file.name}（{file.size} bytes）
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                </div>
              </div>

              {/* AIに取り込む内容 */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="text-sm font-semibold mb-2 text-[#3b2a1a]">
                  AIに取り込む内容
                </div>

                <textarea
                  className="flex-1 w-full min-h-[260px] bg-gray-100 rounded-md px-4 py-3 text-sm resize-none outline-none"
                  placeholder={"複数行テキストボックス\n（議事録・日報・メモなどを貼り付け）"}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                {(reportSummary || reportError) && (
                  <div className="mt-4 bg-white/80 border rounded-md p-4 text-sm">
                    {reportError ? (
                      <div className="text-red-600">報告書作成に失敗: {reportError}</div>
                    ) : (
                      <>
                        <div className="font-semibold mb-2 text-[#3b2a1a]">
                          報告書まとめ（生成結果）
                        </div>
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {reportSummary}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* 右：茶色い枠 */}
            <section className="w-[32%] min-w-[300px] flex justify-end items-start">
              <div className="relative w-full max-w-[370px] h-[480px]">
                <img
                  src="/images/Group 61.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-fill"
                  draggable={false}
                />

                <div className="relative z-10 h-full px-8 py-10 flex flex-col">
                  <div className="text-center text-xl text-white font-semibold tracking-wide py-3">
                    ギルドマスター
                  </div>

                  <div className="mt-5 flex items-start justify-center">
                    <img
                      src="/images/master_smile.png"
                      alt="ギルドマスター"
                      className="w-[280px] max-w-full h-auto object-contain select-none"
                      draggable={false}
                    />
                  </div>

                  <div className="mt-4 text-white leading-relaxed p-3">
                    ここに来たということは、<br />
                    <span className="font-semibold">{selectedQuest.title}</span>
                    のクエストの成果を報告してくれるのじゃな？
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* 下段：ボタン */}
          <div className="shrink-0">
            <div className="flex items-center justify-center gap-14">
              <button type="button" onClick={handleSubmit} className="shrink-0">
                <img
                  src="/images/submit-blue.png"
                  alt="提出する"
                  className="h-20 w-auto select-none cursor-pointer"
                  draggable={false}
                />
              </button>

              <button
                type="button"
                onClick={handleCreateReport}
                className="shrink-0"
                disabled={isReporting}
              >
                <img
                  src="/images/make-blue.png"
                  alt="報告書作成"
                  className={`h-20 w-auto select-none ${
                    isReporting ? "opacity-60" : ""
                  } cursor-pointer`}
                  draggable={false}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProjectQuestLayout>
  );
}

export default function GuildSubmitPage() {
  // ★ useSearchParams を使っている Inner を Suspense でラップ
  return (
    <Suspense fallback={<div className="p-6">読み込み中...</div>}>
      <GuildSubmitPageInner />
    </Suspense>
  );
}
