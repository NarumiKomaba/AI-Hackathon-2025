"use client";

import { useRef, useState } from "react";
import ProjectQuestLayout from "@/components/layout/ProjectQuestLayout";
import { useSearchParams } from "next/navigation";

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

export default function GuildSubmitPage() {
  const searchParams = useSearchParams();
  const questIdFromQuery = searchParams.get("questId");

  const [selectedQuestId, setSelectedQuestId] = useState(
    questIdFromQuery ?? MOCK_QUESTS[0].id
  );
  const [fileName, setFileName] = useState("");
  const [note, setNote] = useState("");


  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedQuest =
    MOCK_QUESTS.find((q) => q.id === selectedQuestId) ?? MOCK_QUESTS[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const handleSubmit = () => alert("提出（モック）");
  const handleCreateReport = () => alert("報告書作成（モック）");

  return (
    <ProjectQuestLayout>
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
                      className="h-16 w-auto select-none" // ←さらに少し大きく
                      draggable={false}
                    />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
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
              </div>
            </section>

            {/* 右：茶色い枠（上寄せ＆少し小さめ） */}
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

          {/* 下段：提出する / 報告書作成 を中央にドン */}
          <div className="shrink-0">
            <div className="flex items-center justify-center gap-14">
              <button type="button" onClick={handleSubmit} className="shrink-0">
                <img
                  src="/images/submit-blue.png"
                  alt="提出する"
                  className="h-20 w-auto select-none" // ←下段はさらにドン
                  draggable={false}
                />
              </button>

              <button type="button" onClick={handleCreateReport} className="shrink-0">
                <img
                  src="/images/make-blue.png"
                  alt="報告書作成"
                  className="h-20 w-auto select-none" // ←下段はさらにドン
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
