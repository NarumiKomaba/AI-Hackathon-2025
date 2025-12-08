"use client";

import ProjectQuestLayout from "@/components/layout/ProjectQuestLayout";

export default function StatusPage() {
  const status = {
    name: "駒場（あなた）",
    title: "プロジェクトの勇者",
    level: 12,
    exp: 128,
    expMax: 200,
    mainRole: "PM / PoC 推進",
    currentQuest: "基幹システム刷新 編",
    equipment: {
      weapon: "スライドデッキ＋AI要約",
      armor: "議事録自動化の鎧",
      accessory: "オンプレ LLM の魔石",
      cloak: "残業のマント（できれば脱ぎたい）",
    },
    baseStats: {
      hp: 57,
      agi: 13,
      atk: 34,
      def: 39,
      weak: 31,
    },
    skills: [
      { key: "pm", label: "PM", exp: 8, max: 10, rank: "熟練者" },
      { key: "ai", label: "AI", exp: 6, max: 10, rank: "中級者" },
      { key: "onprem", label: "オンプレ LLM", exp: 4, max: 10, rank: "見習い" },
      { key: "infra", label: "インフラ構築", exp: 3, max: 10, rank: "見習い" },
    ],
  };

  return (
    <ProjectQuestLayout>
      <div className="h-full py-4 px-6">
        <div className="h-full bg-white rounded-xl shadow-md p-8 flex gap-10">

          {/* 左：キャラクターカード */}
          <section className="w-[40%] bg-gray-100 rounded-xl p-6 flex flex-col">
            {/* キャラ画像 */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-64 h-64 bg-white rounded-lg border border-gray-300 flex items-center justify-center overflow-hidden">
                <img
                  src="/avatar-knight.png"
                  alt="勇者アバター"
                  className="object-contain w-full h-full"
                />
              </div>
            </div>

            {/* 名前・EXP・ロール */}
            <div className="mt-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {status.name}
                  </div>
                  <div className="text-xs text-gray-800 mt-1">
                    {status.title}
                  </div>
                </div>
                <div className="border border-gray-500 rounded-md px-4 py-2 text-sm">
                  Lv.{status.level}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-700 mb-1">
                  経験値 {status.exp} / {status.expMax}
                </div>
                <ProgressBar value={status.exp} max={status.expMax} />
              </div>

              <div className="text-xs text-gray-700 space-y-1 pt-2">
                <div>メインロール：{status.mainRole}</div>
                <div>現在のクエスト：{status.currentQuest}</div>
              </div>
            </div>
          </section>

          {/* 右：装備・ステータス・スキル */}
          <section className="flex-1 flex flex-col text-xs text-gray-800">

            {/* 装備 */}
            <div className="pb-4 border-b border-gray-400">
              <h2 className="text-sm font-semibold mb-2">装備</h2>
              <div className="space-y-1">
                <LabeledRow label="武器" value={status.equipment.weapon} />
                <LabeledRow label="防具" value={status.equipment.armor} />
                <LabeledRow label="アクセサリ" value={status.equipment.accessory} />
                <LabeledRow label="重ね着" value={status.equipment.cloak} />
              </div>
            </div>

            {/* ステータス */}
            <div className="py-4 border-b border-gray-400">
              <h2 className="text-sm font-semibold mb-2">ステータス</h2>
              <div className="space-y-1">
                <LabeledRow label="最大HP" value={status.baseStats.hp} />
                <LabeledRow label="素早さ" value={status.baseStats.agi} />
                <LabeledRow label="攻撃力" value={status.baseStats.atk} />
                <LabeledRow label="防御力" value={status.baseStats.def} />
                <LabeledRow label="弱点" value={status.baseStats.weak} />
              </div>
            </div>

            {/* スキル経験値 */}
            <div className="pt-4 flex-1 flex flex-col">
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="text-sm font-semibold">スキル経験値</h2>
                <span className="text-[11px] text-gray-500">
                  ※ EXP 進行に応じて称号が変化します
                </span>
              </div>

              <div className="space-y-3">
                {status.skills.map((skill) => (
                  <div key={skill.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{skill.label}</span>
                      <span className="text-[11px] text-gray-800">
                        EXP {skill.exp}（{skill.rank}）
                      </span>
                    </div>
                    <ProgressBar value={skill.exp} max={skill.max} />
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </div>
    </ProjectQuestLayout>
  );
}

/* -------------------- 共通コンポーネント -------------------- */

function ProgressBar({ value, max }: { value: number; max: number }) {
  const clamped = Math.max(0, Math.min(value, max));
  const ratio = (clamped / max) * 100;

  return (
    <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
      <div
        className="h-full bg-gray-700 rounded-full"
        style={{ width: `${ratio}%` }}
      />
    </div>
  );
}

function LabeledRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-4">
      <div className="w-16 font-semibold text-gray-800">{label}</div>
      <div className="flex-1">{value}</div>
    </div>
  );
}
