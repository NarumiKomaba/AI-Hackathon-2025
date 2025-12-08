export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-5xl py-20 rounded-xl shadow-lg flex flex-col items-center">
        {/* タイトル */}
        <h1 className="text-6xl font-serif font-bold mb-20 text-gray-900">
          Project Quest
        </h1>

        {/* ボタン行 */}
        <div className="flex gap-10">
          <a
            href="/board"
            className="px-10 py-4 rounded-lg bg-black text-white text-xl hover:bg-gray-800 transition"
          >
            掲示板
          </a>

          <a
            href="/quests"
            className="px-10 py-4 rounded-lg bg-black text-white text-xl hover:bg-gray-800 transition"
          >
            クエスト管理
          </a>

          <a
            href="/status"
            className="px-10 py-4 rounded-lg bg-black text-white text-xl hover:bg-gray-800 transition"
          >
            ステータス
          </a>
        </div>
      </div>
    </main>
  );
}
