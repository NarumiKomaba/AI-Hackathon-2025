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
        const errText = await res.text(); // デバッグ用
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
      {uploading && (
        <LoadingOverlay show={uploading} />
      )}

      <div className="h-full px-8 py-6">
        <div className="h-full bg-white rounded-xl shadow-md px-8 py-6 flex gap-8">
          {/* 左カラム：フォーム */}
          <section className="flex-1 flex flex-col gap-6">
            <div>
              <h1 className="text-lg font-semibold mb-1">新規クエスト作成</h1>
              <p className="text-xs text-gray-800">
                プロジェクトの仕様書・議事録・メモなどのドキュメントをアップロードして、
                ギルドマスターがクエスト（プロジェクト）案を考えます。
                生成されたクエスト案は次の画面で編集できます。
              </p>
            </div>

            {/* クエスト名のヒント（任意） */}
            <div>
              <label className="block text-sm font-semibold mb-1">
                クエスト名のヒント（任意）
              </label>
              <input
                value={questNameHint}
                onChange={(e) => setQuestNameHint(e.target.value)}
                placeholder="例：基幹システム刷新 編、営業支援アプリ UI 改修 など"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm bg-gray-50"
              />
            </div>

            {/* ファイルアップロード（複数 & ドラッグ＆ドロップ対応） */}
            <div>
              <label className="block text-sm font-semibold mb-1">
                プロジェクト関連ドキュメント
              </label>

              {/* ドロップゾーン */}
              <div
                className={`mt-1 border-2 border-dashed rounded-lg px-4 py-6 text-xs text-center cursor-pointer transition
                  ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                  }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <p className="font-semibold mb-1">
                  ここにファイルをドラッグ＆ドロップ
                </p>
                <p className="text-[11px] text-gray-500">
                  または{" "}
                  <span className="underline">クリックしてファイルを選択</span>
                  （複数選択可）
                </p>

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

              {/* 実際の input は非表示 */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* メッセージ表示 */}
            {message && (
              <p className="text-xs text-gray-700 whitespace-pre-line">
                {message}
              </p>
            )}

            {/* クエスト案作成ボタン */}
            <div className="mt-auto pt-4">
              <button
                type="button"
                onClick={handleCreateQuestDraft}
                disabled={selectedFiles.length === 0 || uploading}
                className={`w-56 py-3 rounded-full text-sm font-semibold text-white ${
                  selectedFiles.length === 0 || uploading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gray-900 hover:bg-gray-800"
                }`}
              >
                {uploading
                  ? "クエスト案を作成中..."
                  : "この内容でクエスト案を作成"}
              </button>
            </div>
          </section>

          {/* 右カラム：説明・ガイド */}
          <section className="w-[40%] bg-gray-100 rounded-xl p-6 flex flex-col">
            <h2 className="text-sm font-semibold mb-3">
              クエスト生成の流れ
            </h2>

            <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 text-xs space-y-3 overflow-y-auto">
              <p className="leading-relaxed text-gray-800">
                1. 左側でプロジェクトに関するドキュメントを選択します（複数可）。
              </p>
              <p className="leading-relaxed text-gray-800">
                2. 「この内容でクエスト案を作成」を押すと、ギルドマスターが
                <span className="font-semibold">
                  クエスト名・目的・達成条件・納品対象・概要・報酬・獲得経験値・期間
                </span>
                を自動で下書きします。
              </p>
              <p className="leading-relaxed text-gray-800">
                3. 自動生成されたクエスト案は、次の画面で
                <span className="font-semibold">編集・加筆</span>
                できます。
              </p>
              <p className="leading-relaxed text-gray-800">
                4. 確定したクエストは、メンバー募集・進捗管理・週次レポート生成などに
                利用されます。
              </p>
            </div>

            <div className="mt-4 text-[11px] text-gray-500">
              ※ 現時点ではクエスト案生成は Vertex AI（Gemini）を利用しています。
              <br />
              プロンプトを調整することで、表現や粒度をあとからチューニング可能です。
            </div>
          </section>
        </div>
      </div>
    </ProjectQuestLayout>
  );
}
