"use client";

import {
  useState,
  useRef,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytes } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  getFirebaseStorage,
  getFirebaseFirestore,
} from "@/lib/firebaseClient";
import ProjectQuestLayout from "@/components/layout/ProjectQuestLayout";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";

// ★ 新しいクエスト案の形式に合わせる
type QuestDraft = {
  title: string;
  durationDays: number;
  objective: string;
  conditions: string[];
  deliverables: string[];
  summary: string;
  rewards: string[];
  expGains: string[];
};

export default function NewQuestPage() {
  const router = useRouter();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [questNameHint, setQuestNameHint] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fileNamePreview =
    selectedFiles.length === 0
      ? ""
      : selectedFiles.length === 1
        ? selectedFiles[0].name
        : `${selectedFiles.length} ファイル選択中`;

  // ファイル設定を共通化（クリック/ドロップ両方から呼ぶ）
  const applySelectedFiles = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) {
      setSelectedFiles([]);
    } else {
      const arr = Array.from(files);
      setSelectedFiles(arr);
    }
    setMessage("");
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    applySelectedFiles(e.target.files);
  };

  // ドラッグ & ドロップ用ハンドラ
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      applySelectedFiles(files);
    }
  };

  // 「この内容でクエスト案を作成」ボタン
  // 1) Storage にアップロード
  // 2) questSourceFiles に記録
  // 3) Vertex の API でクエスト案生成
  // 4) projectDrafts に保存して draftId 付きで編集画面へ遷移
  const handleCreateQuestDraft = async () => {
    if (selectedFiles.length === 0) {
      alert("ファイルを選択してください。");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const storage = getFirebaseStorage();
      const db = getFirebaseFirestore();

      const tempProjectId = crypto.randomUUID();

      for (const [index, file] of selectedFiles.entries()) {
        const path = `quests/${tempProjectId}/${index}-${Date.now()}-${file.name}`;
        const fileRef = ref(storage, path);

        // 1) Storage にアップロード
        await uploadBytes(fileRef, file);

        // 2) アップロード元ファイルとして Firestore に記録
        await addDoc(collection(db, "questSourceFiles"), {
          tempProjectId,
          path,
          originalName: file.name,
          size: file.size,
          type: file.type,
          createdAt: serverTimestamp(),
        });
      }

      // 3) Vertex に投げる API を呼ぶ（ファイルはサーバー側で読む）
      const res = await fetch("/api/quest-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempProjectId,
          hintTitle: questNameHint,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("quest-draft API error:", res.status, errText);
        throw new Error("AI draft API error");
      }

      const draft: QuestDraft = await res.json();

      // 4) projectDrafts に保存（編集用の下書き）
      const draftDocRef = await addDoc(collection(db, "projectDrafts"), {
        title: draft.title,
        durationDays: draft.durationDays,
        objective: draft.objective,
        conditions: draft.conditions ?? [],
        deliverables: draft.deliverables ?? [],
        summary: draft.summary ?? "",
        rewards: draft.rewards ?? [],
        expGains: draft.expGains ?? [],
        tempProjectId,
        createdAt: serverTimestamp(),
      });

      router.push(`/quest/new/edit?draftId=${draftDocRef.id}`);
    } catch (err) {
      console.error("handleCreateQuestDraft error:", err);
      setMessage("クエスト案の作成に失敗しました…");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ProjectQuestLayout>
      <LoadingOverlay show={uploading} />

      <div className="h-full px-8 py-6">
        {/* 全体：上下分割（上：内容、下：大ボタン） */}
        <div className="h-full flex flex-col gap-8">
          {/* 上段：左右分割 */}
          <div className="flex-1 flex gap-10 min-h-0">
            {/* 左：作成フォーム */}
            <section className="flex-1 flex flex-col gap-6 min-h-0">

              {/* クエスト名のヒント */}
              <div>
                <div className="text-sm font-semibold mb-2 text-[#3b2a1a]">
                  クエスト名のヒント（任意）
                </div>
                <input
                  value={questNameHint}
                  onChange={(e) => setQuestNameHint(e.target.value)}
                  placeholder="例：基幹システム刷新 編、営業支援アプリ UI 改修 など"
                  className="w-full bg-gray-100 rounded-md px-4 py-3 text-sm outline-none"
                />
              </div>

              {/* ファイルアップロード（参考の見た目に寄せる＋D&D維持） */}
              <div>
                <div className="text-sm font-semibold mb-2 text-[#3b2a1a]">
                  ファイルアップロード
                </div>

                <div
                  className={`flex items-center gap-4 ${
                    isDragging ? "ring-2 ring-indigo-400 rounded-md" : ""
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div
                    className={`flex-1 bg-gray-100 rounded-md px-4 py-3 text-sm text-gray-600 truncate ${
                      isDragging ? "bg-indigo-50" : ""
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        fileInputRef.current?.click();
                      }
                    }}
                    title={
                      selectedFiles.length > 0
                        ? selectedFiles.map((f) => f.name).join("\n")
                        : "クリックしてファイルを選択（複数可）"
                    }
                  >
                    {fileNamePreview || "ファイル名************（クリック or ドロップ）"}
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
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-3 text-left max-h-24 overflow-y-auto text-[11px] text-gray-800">
                    <p className="font-semibold mb-1">
                      選択中: {selectedFiles.length} ファイル
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {selectedFiles.map((file, i) => (
                        <li key={`${file.name}-${file.size}-${i}`}>
                          {file.name}（{file.size} bytes）
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* メッセージ */}
              {message && (
                <div className="bg-white/80 border rounded-md p-4 text-sm">
                  <div className="text-red-600 whitespace-pre-line">
                    {message}
                  </div>
                </div>
              )}
            </section>

            {/* 右：茶色い枠（参考画面と同じ見た目） */}
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
                    ドキュメントを預かろう。<br />
                    そこからクエスト（プロジェクト）案を起こしてやるぞ。<br />
                    ヒントがあるなら、上に書いておくのじゃ。
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* 下段：大ボタン（参考の配置に合わせる） */}
          <div className="shrink-0">
            <div className="flex items-center justify-center gap-14">
              <button
                type="button"
                onClick={handleCreateQuestDraft}
                disabled={selectedFiles.length === 0 || uploading}
                className="shrink-0"
                aria-disabled={selectedFiles.length === 0 || uploading}
                title={
                  selectedFiles.length === 0
                    ? "ファイルを選択してください"
                    : "クエスト案を作成"
                }
              >
                {/* 画像があるならこれに統一（参考の make-blue.png を流用） */}
                <img
                  src="/images/ai-blue.png"
                  alt="この内容でクエスト案を作成"
                  className={`h-20 w-auto select-none cursor-pointer ${
                    selectedFiles.length === 0 || uploading ? "opacity-60" : ""
                  }`}
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
