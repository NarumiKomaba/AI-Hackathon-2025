"use client";

import { useState } from "react";
import ProjectQuestLayout from "@/components/layout/ProjectQuestLayout";

type Quest = {
  id: string;
  title: string;
  recommendedLevel: number;
  elapsedDays: number;
};

const MOCK_QUESTS: Quest[] = [
  {
    id: "core-system",
    title: "基幹システム刷新 編",
    recommendedLevel: 36,
    elapsedDays: 120,
  },
  {
    id: "sales-ui",
    title: "営業支援アプリ UI 改修",
    recommendedLevel: 18,
    elapsedDays: 45,
  },
  {
    id: "onprem-llm",
    title: "オンプレ LLM 検証クエスト",
    recommendedLevel: 24,
    elapsedDays: 60,
  },
];

export default function GuildSubmitPage() {
  const [selectedQuestId, setSelectedQuestId] = useState(MOCK_QUESTS[0].id);
  const [fileName, setFileName] = useState("");
  const [note, setNote] = useState("");

  const selectedQuest =
    MOCK_QUESTS.find((q) => q.id === selectedQuestId) ?? MOCK_QUESTS[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const handleSubmit = () => {
    // ここで Firebase / API に送るイメージ
    alert("ギルドマスターに提出した体でモック動作します。");
  };

  const handleCreateReport = () => {
    alert("報告書作成（PDF/PPTX）モックです。");
  };

  return (
    <ProjectQuestLayout>
      <div className="h-full px-8 py-6">
        <div className="h-full bg-white rounded-xl shadow-md p-8 flex gap-10">
          {/* 左：提出フォーム */}
          <section className="flex-1 flex flex-col gap-6">
            {/* クエスト名 */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                クエスト名
              </label>
              <div className="bg-gray-100 rounded-lg px-4 py-3 text-sm">
                <select
                  className="w-full bg-transparent outline-none"
                  value={selectedQuestId}
                  onChange={(e) => setSelectedQuestId(e.target.value)}
                >
                  {MOCK_QUESTS.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}（推奨Lv{q.recommendedLevel} / 経過
                      {q.elapsedDays}日）
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ファイルアップロード */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                ファイルアップロード
              </label>
              <div className="flex gap-3 items-center">
                <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 text-sm text-gray-500 truncate">
                  {fileName || "ファイル名＊＊＊＊＊＊＊＊＊＊"}
                </div>
                <label className="inline-block">
                  <span className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-black text-white text-sm cursor-pointer hover:bg-gray-800">
                    アップロードボタン
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

            {/* AIに取り込む内容 */}
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-semibold mb-2">
                AIに取り込む内容
              </label>
              <div className="flex-1">
                <textarea
                  className="w-full h-full min-h-[180px] bg-gray-100 rounded-lg px-4 py-3 text-sm resize-none outline-none"
                  placeholder="複数行テキストボックス&#13;&#10;（議事録・日報・メモなどを貼り付け）"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            {/* ボタン行 */}
            <div className="flex gap-4 pt-2">
              <button
                onClick={handleSubmit}
                className="w-40 py-3 rounded-full bg-black text-white text-sm font-semibold hover:bg-gray-800"
              >
                提出する
              </button>
              <button
                onClick={handleCreateReport}
                className="w-40 py-3 rounded-full bg-white border border-gray-800 text-sm font-semibold hover:bg-gray-100"
              >
                報告書作成
              </button>
            </div>
          </section>

          {/* 右：ギルドマスターカード */}
          <section className="w-[40%] bg-gray-100 rounded-xl overflow-hidden flex flex-col">
            {/* 画像部分 */}
            <div className="flex-1 bg-white flex items-center justify-center">
              <div className="w-full h-full max-h-[260px] flex items-center justify-center">
                <img
                  src="/guildmaster.png"
                  alt="ギルドマスター"
                  className="object-contain max-h-full"
                />
              </div>
            </div>

            {/* セリフ部分 */}
            <div className="bg-gray-700 text-white px-6 py-4 text-sm leading-relaxed">
              <div className="font-semibold mb-1">ギルドマスター：</div>
              <p className="text-xs leading-relaxed">
                ここに来たということは、
                <span className="font-semibold">{selectedQuest.title}</span>
                のクエストを終えたということじゃな？
                <br />
                ファイルとメモを確認して、週次報告書のドラフトを
                つくっておいてやろう。
              </p>
            </div>
          </section>
        </div>
      </div>
    </ProjectQuestLayout>
  );
}
