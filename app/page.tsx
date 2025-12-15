import Image from "next/image";

export default function Home() {
  return (
    <main
      className="
        min-h-screen
        flex items-center justify-center
        bg-[url('/images/thumbnail_guild.jpg')]
        bg-cover bg-center
      "
    >
      {/* 巻物＋青いボード全体のコンテナ */}
      <div className="relative w-full max-w-5xl aspect-[16/9] flex items-center justify-center">
        {/* 背景ボード（巻物） */}
        <Image
          src="/images/背景ボード@144x 1.png"
          alt="背景ボード"
          fill
          priority
          className="object-contain"
        />

        {/* 青いボード */}
        <div className="absolute -inset-4">
          <Image
            src="/images/Group 56.png"
            alt="青いボード"
            fill
            className="object-contain"
          />
        </div>

        {/* コンテンツ（アイコン・タイトル・ボタン） */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* アイコン */}
          <div className="mb-6">
            <div className="relative w-24 h-24">
              <Image
                src="/images/thumbnail_emblem.jpg"
                alt="Project Quest Emblem"
                fill
                className="object-cover rounded"
              />
            </div>
          </div>

          {/* タイトル */}
          <h1 className="text-5xl md:text-6xl font-serif text-yellow-300 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)] mb-12">
            Project Quest
          </h1>

          {/* ボタン行 */}
          <div className="flex gap-6 md:gap-10">
            {/* 掲示板 */}
            <a href="/board" className="block">
              <div className="relative w-40 h-12 md:w-48 md:h-14">
                <Image
                  src="/images/アセット 9@144x.png"
                  alt="掲示板"
                  fill
                  className="object-contain"
                />
              </div>
            </a>

            {/* クエスト管理 */}
            <a href="/quests" className="block">
              <div className="relative w-40 h-12 md:w-48 md:h-14">
                <Image
                  src="/images/クエスト管理@144x.png"
                  alt="クエスト管理"
                  fill
                  className="object-contain"
                />
              </div>
            </a>

            {/* ステータス */}
            <a href="/status" className="block">
              <div className="relative w-40 h-12 md:w-48 md:h-14">
                <Image
                  src="/images/ステータス@144x.png"
                  alt="ステータス"
                  fill
                  className="object-contain"
                />
              </div>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
