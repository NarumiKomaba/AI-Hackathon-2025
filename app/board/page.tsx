"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProjectQuestLayout from "@/components/layout/ProjectQuestLayout";

type BoardQuestStatus = "参加中" | "募集中";

type BoardQuest = {
  id: string;
  title: string;
  recommendedLevel: number;
  durationDays: number;
  status: BoardQuestStatus;
  objective: string;
  conditions: string[];
  deliverables: string[];
  summary: string;
  rewards: string[];
  expGains: string[];
  partySlots: PartySlot[];
};

type PartySlot = {
  id: string;
  role: string;
  name: string;
  isYou?: boolean;
  filled: boolean;
};

const MOCK_QUESTS: BoardQuest[] = [
  {
    id: "core-system",
    title: "基幹システム刷新 編",
    recommendedLevel: 36,
    durationDays: 120,
    status: "参加中",
    objective: "基幹システムの刷新により業務効率と保守性を向上させる。",
    conditions: [
      "要件定義書・基本設計書の確定と承認を完了する",
      "主要画面・バッチの結合テストを完了する",
      "移行リハーサルを実施し、致命的な不具合が残っていない状態にする",
    ],
    deliverables: [
      "要件定義書・基本設計書一式（立文書スタイルの魔導書）",
      "総合テスト結果レポート（試験のログ）",
      "移行計画書・手順書（転送の儀式書）",
    ],
    summary:
      "老朽化した基幹システムを刷新し、周辺システムとのインタフェースを整理する大規模クエスト。ステークホルダーも多く、要件調整とスケジュール管理が難航している。",
    rewards: [
      "課長との豪華お食事券（焼肉コース）",
      "来週分の定例会議 1 回免除チケット",
      "チームメンバーと打ち上げ飲み会（会社負担を期待）",
    ],
    expGains: ["PM EXP +3", "インフラ構築 EXP +2", "オンプレ LLM EXP +1"],
    partySlots: [
      {
        id: "slot-1",
        role: "勇者",
        name: "駒場（あなた）",
        isYou: true,
        filled: true,
      },
      { id: "slot-2", role: "戦士", name: "大和", filled: true },
      { id: "slot-3", role: "魔法使い", name: "小﨑", filled: true },
      { id: "slot-4", role: "僧侶", name: "募集中", filled: false },
      { id: "slot-5", role: "盗賊", name: "募集中", filled: false },
      { id: "slot-6", role: "吟遊詩人", name: "募集中", filled: false },
    ],
  },
  {
    id: "sales-ui",
    title: "営業支援アプリ UI 改修",
    recommendedLevel: 18,
    durationDays: 45,
    status: "募集中",
    objective: "営業担当者の UX を改善し、入力ストレスを軽減する。",
    conditions: [
      "既存画面の課題洗い出しを完了する",
      "プロトタイプ UI を 3 パターン作成する",
      "ユーザビリティテストを実施し改善案をまとめる",
    ],
    deliverables: [
      "課題整理シート",
      "新 UI ワイヤーフレーム一式",
      "ユーザビリティテスト結果レポート",
    ],
    summary:
      "営業支援アプリの画面を刷新し、入力しやすく見やすい UI に生まれ変わらせるクエスト。現場ヒアリングと素早いプロトタイピングが鍵となる。",
    rewards: [
      "営業部からの感謝のメッセージカード",
      "チーム内 UX 勉強会での LT 枠",
    ],
    expGains: ["UI 設計 EXP +2", "ユーザビリティ EXP +2"],
    partySlots: [
      {
        id: "slot-1",
        role: "勇者",
        name: "募集中",
        filled: false,
      },
      { id: "slot-2", role: "デザイナー", name: "募集中", filled: false },
      { id: "slot-3", role: "フロントエンド", name: "募集中", filled: false },
      { id: "slot-4", role: "営業代表", name: "募集中", filled: false },
      { id: "slot-5", role: "QA", name: "募集中", filled: false },
      { id: "slot-6", role: "スクライバー", name: "募集中", filled: false },
    ],
  },
  {
    id: "onprem-llm",
    title: "オンプレ LLM 検証クエスト",
    recommendedLevel: 24,
    durationDays: 60,
    status: "募集中",
    objective: "オンプレ環境で LLM を安全かつ高性能に運用できるか検証する。",
    conditions: [
      "GPU サーバ環境の構築を完了する",
      "会話要約・翻訳など主要ユースケースの評価を完了する",
      "ガードレール要件を整理し PoC レポートにまとめる",
    ],
    deliverables: [
      "検証計画書・観点一覧",
      "評価レポート（精度・性能・コスト）",
      "ガードレール仕様書（封印の書）",
    ],
    summary:
      "オンプレミスの GPU クラスタ上で複数 LLM を比較検証するクエスト。性能チューニングとセキュリティ要件の両立が試される。",
    rewards: ["GPU サーバ見学ツアー", "技術ブログ執筆チャンス"],
    expGains: ["LLM 運用 EXP +3", "セキュリティ設計 EXP +1"],
    partySlots: [
      { id: "slot-1", role: "勇者", name: "募集中", filled: false },
      { id: "slot-2", role: "インフラ", name: "募集中", filled: false },
      { id: "slot-3", role: "アプリ担当", name: "募集中", filled: false },
      { id: "slot-4", role: "検証リーダー", name: "募集中", filled: false },
      { id: "slot-5", role: "記録係", name: "募集中", filled: false },
      { id: "slot-6", role: "おやつ係", name: "募集中", filled: false },
    ],
  },
];

export default function BoardPage() {
  const router = useRouter();
  const [quests, setQuests] = useState<BoardQuest[]>(MOCK_QUESTS);
  const [selectedId, setSelectedId] = useState<string>(MOCK_QUESTS[0].id);

  const selected = quests.find((q) => q.id === selectedId)!;

  const handleJoin = () => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== selected.id) return q;
        if (q.status === "参加中") return q;

        // 空きスロットに「勇者 駒場（あなた）」を追加するイメージ
        const newSlots = [...q.partySlots];
        const emptyIndex = newSlots.findIndex((s) => !s.filled);
        if (emptyIndex >= 0) {
          newSlots[emptyIndex] = {
            ...newSlots[emptyIndex],
            name: "駒場（あなた）",
            role: "勇者",
            filled: true,
            isYou: true,
          };
        }

        return {
          ...q,
          status: "参加中",
          partySlots: newSlots,
        };
      })
    );
  };

  return (
    <ProjectQuestLayout>
      {/* ここから中身だけ */}
      <div className="h-full flex gap-6 py-4 px-6">
        {/* 左：募集クエスト一覧 */}
        <aside className="w-72 bg-white rounded-xl shadow-md p-4 flex flex-col">
          <h2 className="text-lg font-semibold mb-4">募集クエスト</h2>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {quests.map((quest) => {
              const isActive = quest.id === selectedId;
              return (
                <button
                  key={quest.id}
                  onClick={() => setSelectedId(quest.id)}
                  className={`w-full text-left rounded-xl px-4 py-3 border transition ${
                    isActive
                      ? "bg-gray-100 border-gray-700"
                      : "bg-gray-50 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-900">
                    {quest.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    推奨Lv{quest.recommendedLevel} / 経過{
                      quest.durationDays
                    }
                    日
                  </div>
                  <div className="mt-2">
                    <span
                      className={`inline-block w-full text-center px-3 py-1 rounded-full text-[11px] ${
                        quest.status === "参加中"
                          ? "bg-black text-white"
                          : "bg-gray-300 text-gray-800"
                      }`}
                    >
                      {quest.status === "参加中" ? "参加中" : "参加する"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 追加ボタン（モック） */}
          <div className="mt-4 flex justify-center">
            <button className="w-12 h-12 rounded-full bg-gray-200 border border-gray-400 flex items-center justify-center text-2xl leading-none text-gray-700" onClick={() => router.push("/quest/new")}>
              +
            </button>
          </div>
        </aside>

        {/* 右：クエスト詳細 */}
        <section className="flex-1 bg-white rounded-xl shadow-md p-4 flex flex-col">
          {/* 上部：クエストタイトル */}
          <div className="bg-gray-100 rounded-lg px-4 py-3 mb-4">
            <div className="text-sm font-semibold text-gray-900">
              {selected.title}
            </div>
            <div className="text-xs text-gray-800 mt-1">
              推奨Lv{selected.recommendedLevel} / 経過
              {selected.durationDays}日
            </div>
          </div>

          {/* 詳細テキストエリア */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-8 text-xs leading-relaxed">
              {/* 左カラム：目的・達成条件・納品物 */}
              <div>
                <SectionTitle>目的</SectionTitle>
                <p className="mb-3 text-gray-800">{selected.objective}</p>

                <SectionTitle>達成条件</SectionTitle>
                <ul className="list-disc list-inside mb-3 text-gray-800 space-y-1">
                  {selected.conditions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>

                <SectionTitle>納品対象</SectionTitle>
                <ul className="list-disc list-inside mb-3 text-gray-800 space-y-1">
                  {selected.deliverables.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>

              {/* 右カラム：概要・報酬・経験値 */}
              <div>
                <SectionTitle>概要</SectionTitle>
                <p className="mb-3 text-gray-800">{selected.summary}</p>

                <SectionTitle>報酬</SectionTitle>
                <ul className="list-disc list-inside mb-3 text-gray-800 space-y-1">
                  {selected.rewards.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>

                <SectionTitle>獲得経験値</SectionTitle>
                <ul className="list-disc list-inside mb-3 text-gray-800 space-y-1">
                  {selected.expGains.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* パーティ構成 */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-3">
                パーティ構成★募集中と現在の人
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 overflow-x-auto">
                  <div className="flex gap-3 min-w-max">
                    {selected.partySlots.map((slot) => (
                      <PartyCard key={slot.id} slot={slot} />
                    ))}
                  </div>
                </div>
                {/* 右端の矢印（スクロールのイメージ） */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-lg">
                    &gt;
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 下部：参加ボタン */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleJoin}
              disabled={selected.status === "参加中"}
              className={`w-64 py-3 rounded-full text-sm font-semibold transition ${
                selected.status === "参加中"
                  ? "bg-gray-400 text-white cursor-default"
                  : "bg-black text-white hover:bg-gray-800"
              }`}
            >
              {selected.status === "参加中"
                ? "このクエストに参加中"
                : "参加する"}
            </button>
          </div>
        </section>
      </div>
    </ProjectQuestLayout>
  );
}

// ---------- サブコンポーネント ----------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-gray-700 mb-1 border-b border-gray-300 pb-0.5">
      {children}
    </h3>
  );
}

function PartyCard({ slot }: { slot: PartySlot }) {
  const filledClass = slot.filled
    ? slot.isYou
      ? "bg-gray-900 text-white"
      : "bg-gray-700 text-white"
    : "bg-gray-100 text-gray-400";

  const label = slot.filled ? slot.role : "募集中";

  return (
    <div className="w-32 h-40 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
      {/* 上：アイコン領域（プレースホルダ） */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center text-[11px] text-gray-500">
        {slot.filled ? "参加メンバー" : "空きスロット"}
      </div>

      {/* 下：ロール＆名前 */}
      <div className={`${filledClass} px-2 py-2 text-center text-[11px]`}>
        <div className="font-semibold">{label}</div>
        <div className="mt-1">
          {slot.filled ? slot.name : "募集中（誰でも）"}
        </div>
      </div>
    </div>
  );
}
