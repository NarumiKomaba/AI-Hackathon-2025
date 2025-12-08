"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProjectQuestLayout from "@/components/layout/ProjectQuestLayout";

type QuestStatus = "進行中" | "未着手" | "期限切れ";

type Quest = {
  id: string;
  title: string;
  recommendedLevel: number;
  elapsedDays: number;
  status: QuestStatus;
};

type ProgressMetric = {
  label: string;
  key: "agi" | "hp" | "exp";
  value: number; // 0-100
};

type Debuff = {
  id: string;
  label: string;
};

type QuestDetail = {
  questId: string;
  metrics: ProgressMetric[];
  debuffs: Debuff[];
  guildMasterComment: string;
};

type Task = {
  id: string;
  title: string;
  owner: string;
  due: string;
  status: "未着手" | "進行中" | "完了";
  progress: number; // 0-100
};

type TabKey = "progress" | "gantt" | "tasks";

// -------------------- モックデータ --------------------

const QUESTS: Quest[] = [
  {
    id: "core-system",
    title: "基幹システム刷新 編",
    recommendedLevel: 36,
    elapsedDays: 120,
    status: "進行中",
  },
  {
    id: "sales-ui",
    title: "営業支援アプリ UI 改修",
    recommendedLevel: 18,
    elapsedDays: 45,
    status: "未着手",
  },
  {
    id: "onprem-llm",
    title: "オンプレ LLM 検証クエスト",
    recommendedLevel: 24,
    elapsedDays: 60,
    status: "進行中",
  },
];

const QUEST_DETAILS: QuestDetail[] = [
  {
    questId: "core-system",
    metrics: [
      { label: "AGI（進捗）", key: "agi", value: 65 },
      { label: "HP（コスト）", key: "hp", value: 45 },
      { label: "EXP（タスク）", key: "exp", value: 40 },
    ],
    debuffs: [
      { id: "meeting-hell", label: "会議地獄（集中力低下）" },
      { id: "night-call", label: "夜間緊急依頼（呪い）" },
    ],
    guildMasterComment:
      "勇者よ、このままでは HP が尽きかけておる。会議を整理し、優先度の低い依頼から一度荷物を降ろすのじゃ。移行リハーサルの準備も忘れるでないぞ。",
  },
  {
    questId: "sales-ui",
    metrics: [
      { label: "AGI（進捗）", key: "agi", value: 10 },
      { label: "HP（コスト）", key: "hp", value: 5 },
      { label: "EXP（タスク）", key: "exp", value: 15 },
    ],
    debuffs: [{ id: "requirement-fog", label: "要件モヤモヤ（視界不良）" }],
    guildMasterComment:
      "ユーザーインタビューの準備を整えよ。真の課題はお客様の一言の中に潜んでおるぞ。",
  },
  {
    questId: "onprem-llm",
    metrics: [
      { label: "AGI（進捗）", key: "agi", value: 55 },
      { label: "HP（コスト）", key: "hp", value: 60 },
      { label: "EXP（タスク）", key: "exp", value: 50 },
    ],
    debuffs: [
      { id: "gpu-heat", label: "GPU 熱暴走" },
      { id: "policy-maze", label: "ポリシー迷宮" },
    ],
    guildMasterComment:
      "検証観点は十分か？セキュリティ・精度・運用コスト、その三つ巴をバランスよく見極めるのじゃ。",
  },
];

const TASKS_BY_QUEST: Record<string, Task[]> = {
  "core-system": [
    {
      id: "env-setup",
      title: "環境構築",
      owner: "未選択",
      due: "2025-12-05",
      status: "進行中",
      progress: 20,
    },
    {
      id: "dir-env",
      title: "DIR 環境",
      owner: "大和",
      due: "2025-12-05",
      status: "進行中",
      progress: 60,
    },
    {
      id: "dynamo-env",
      title: "DynamoAI 環境構築",
      owner: "小﨑",
      due: "2025-12-05",
      status: "進行中",
      progress: 40,
    },
    {
      id: "prod-test",
      title: "本番利用に向けた検証",
      owner: "駒場",
      due: "2025-12-05",
      status: "完了",
      progress: 100,
    },
    {
      id: "safety",
      title: "セーフティ",
      owner: "未選択",
      due: "2025-12-05",
      status: "未着手",
      progress: 0,
    },
  ],
  "sales-ui": [
    {
      id: "hearing",
      title: "営業担当ヒアリング",
      owner: "駒場",
      due: "2025-12-10",
      status: "進行中",
      progress: 30,
    },
  ],
  "onprem-llm": [
    {
      id: "whisper-eval",
      title: "文字起こし精度検証",
      owner: "中澤",
      due: "2025-12-08",
      status: "進行中",
      progress: 50,
    },
  ],
};

// -------------------- ページコンポーネント --------------------

export default function QuestManagementPage() {
  const router = useRouter();
  const [selectedQuestId, setSelectedQuestId] = useState<string>(
    QUESTS[0]?.id ?? ""
  );
  const [activeTab, setActiveTab] = useState<TabKey>("progress");

  const selectedQuest = QUESTS.find((q) => q.id === selectedQuestId)!;
  const detail = QUEST_DETAILS.find((d) => d.questId === selectedQuestId)!;
  const tasks = TASKS_BY_QUEST[selectedQuestId] ?? [];

  return (
    <ProjectQuestLayout>
      <div className="h-full flex gap-6 py-4 px-6">
        {/* 左：参加中クエストリスト */}
        <aside className="w-72 bg-white rounded-xl shadow-md p-4 flex flex-col">
          <h2 className="text-lg font-semibold mb-4">参加中クエスト</h2>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {QUESTS.map((quest) => {
              const isActive = quest.id === selectedQuestId;
              return (
                <button
                  key={quest.id}
                  onClick={() => setSelectedQuestId(quest.id)}
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
                    推奨Lv{quest.recommendedLevel} / 経過 {quest.elapsedDays}日
                  </div>
                  <div className="mt-2">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[11px] ${
                        quest.status === "進行中"
                          ? "bg-gray-700 text-white"
                          : quest.status === "未着手"
                          ? "bg-gray-300 text-gray-800"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {quest.status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* 右：詳細パネル */}
        <section className="flex-1 bg-white rounded-xl shadow-md p-4 flex flex-col">
          {/* クエストヘッダー */}
          <div className="bg-gray-100 rounded-lg px-4 py-3 mb-4">
            <div className="text-sm font-semibold text-gray-900">
              {selectedQuest.title}
            </div>
            <div className="text-xs text-gray-800 mt-1">
              推奨Lv{selectedQuest.recommendedLevel} / 経過{" "}
              {selectedQuest.elapsedDays}日
            </div>
          </div>

          {/* タブ */}
          <div className="flex gap-2 mb-4">
            <TabButton
              label="進捗状況"
              active={activeTab === "progress"}
              onClick={() => setActiveTab("progress")}
            />
            <TabButton
              label="ガントチャート"
              active={activeTab === "gantt"}
              onClick={() => setActiveTab("gantt")}
            />
            <TabButton
              label="タスクリスト"
              active={activeTab === "tasks"}
              onClick={() => setActiveTab("tasks")}
            />
          </div>

          {/* タブコンテンツ＋「提出」ボタン */}
          <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 p-5 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {activeTab === "progress" && <ProgressView detail={detail} />}
              {activeTab === "gantt" && <GanttView />}
              {activeTab === "tasks" && <TaskListView tasks={tasks} />}
            </div>

            {/* 下部：ギルドマスターに提出（タブ共通・固定位置） */}
            <div className="mt-4 flex justify-end">
              <button onClick={() => router.push("/quest/submit")} className="px-8 py-2 rounded-full bg-black text-white text-sm hover:bg-gray-800">
                ギルドマスターに提出
              </button>
            </div>
          </div>
        </section>
      </div>
    </ProjectQuestLayout>
  );
}

// -------------------- サブコンポーネント --------------------

function TabButton(props: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={props.onClick}
      className={`flex-1 py-2 text-sm rounded-t-xl border-b-2 transition ${
        props.active
          ? "bg-black text-white border-black"
          : "bg-gray-200 text-gray-700 border-gray-400 hover:bg-gray-300"
      }`}
    >
      {props.label}
    </button>
  );
}

function ProgressView({ detail }: { detail: QuestDetail }) {
  return (
    <div className="flex flex-col gap-6">
      {/* 上段：進行状況 vs デバフ（横並び） */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* 左：ドーナツ3つ */}
        <div className="md:w-2/3">
          <h3 className="text-sm font-semibold mb-3">進行状況</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {detail.metrics.map((m) => (
              <div key={m.key} className="flex flex-col items-center gap-2">
                <Donut value={m.value} />
                <div className="text-sm font-medium text-gray-800">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右：デバフ */}
        <div className="md:w-1/3">
          <h3 className="text-sm font-semibold mb-3">状態異常（デバフ）</h3>
          <div className="flex flex-wrap gap-2">
            {detail.debuffs.map((d) => (
              <span
                key={d.id}
                className="inline-flex items-center px-3 py-1 rounded-full bg-gray-700 text-white text-[11px]"
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 下段：ギルドマスターコメント（横いっぱい） */}
      <div>
        <h3 className="text-sm font-semibold mb-3">
          ギルドマスターの一言
        </h3>
        <div className="flex items-stretch gap-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {/* アバター（プレースホルダ） */}
          <div className="w-24 h-24 bg-gray-300 rounded-md flex items-center justify-center">
            <span className="text-xs text-gray-700">GM</span>
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-700 mb-2 border-b border-gray-300 pb-1">
              ギルドマスターの一言
            </div>
            <p className="text-xs leading-relaxed text-gray-700">
              {detail.guildMasterComment}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Donut({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const deg = (clamped / 100) * 360;

  return (
    <div className="relative w-24 h-24">
      <div
        className="w-full h-full rounded-full"
        style={{
          background: `conic-gradient(#111 ${deg}deg, #e5e5e5 0deg)`,
        }}
      />
      <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
        <span className="text-lg font-semibold text-gray-900">
          {clamped}%
        </span>
      </div>
    </div>
  );
}

function GanttView() {
  // 〇表示＆クリックで詳細
  const rows = [
    {
      label: "環境構築",
      start: 1,
      end: 5,
      description: "DIR / Dynamo / Vertex などの環境を用意するフェーズ。",
    },
    {
      label: "本番利用に向けた検証",
      start: 3,
      end: 9,
      description: "性能・精度・コスト・運用観点の検証フェーズ。",
    },
    {
      label: "今後の発展に向けた検証",
      start: 4,
      end: 8,
      description: "追加ユースケースや拡張方針の検討フェーズ。",
    },
  ];
  const days = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const [activeRowLabel, setActiveRowLabel] = useState<string | null>(
    rows[0]?.label ?? null
  );

  const activeRow = rows.find((r) => r.label === activeRowLabel) ?? rows[0];

  return (
    <div className="flex flex-col gap-4 h-full">
      <h3 className="text-sm font-semibold">ガントチャート（〇表示モック）</h3>
      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th className="w-40 px-3 py-2 text-left border-b bg-gray-50">
                タスク
              </th>
              {days.map((d) => (
                <th
                  key={d}
                  className="px-2 py-2 text-center border-b bg-gray-50"
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.label}
                </td>
                {days.map((d) => {
                  const active = d >= row.start && d <= row.end;
                  const isSelected = activeRowLabel === row.label;
                  return (
                    <td
                      key={d}
                      className="px-1 py-2 text-center align-middle"
                    >
                      {active && (
                        <button
                          type="button"
                          onClick={() => setActiveRowLabel(row.label)}
                          className={`w-4 h-4 rounded-full border text-[10px] leading-none flex items-center justify-center ${
                            isSelected
                              ? "bg-black text-white border-black"
                              : "bg-white text-gray-700 border-gray-500"
                          }`}
                          aria-label={`${row.label} の ${d}日目`}
                        >
                          ●
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* クリックしたタスクの詳細 */}
      <div className="text-xs bg-white border border-gray-200 rounded-lg p-3">
        <div className="font-semibold mb-1">{activeRow.label}</div>
        <div className="text-gray-700">{activeRow.description}</div>
      </div>
    </div>
  );
}

function TaskListView({ tasks }: { tasks: Task[] }) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          今週のクエスト達成状況（モック）
        </h3>
        <p className="text-xs text-gray-500">
          {tasks.length} 件のタスク
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-900">
                {task.title}
              </div>
              <span className="text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                {task.status}
              </span>
            </div>
            <div className="text-[11px] text-gray-800 space-y-1 mb-3">
              <div>
                担当: <span className="font-medium">{task.owner}</span>
              </div>
              <div>期限: {task.due}</div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>進捗</span>
                <span>{task.progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-800 rounded-full"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <p className="text-xs text-gray-500">
          このクエストにはまだタスクが登録されていません。
        </p>
      )}
    </div>
  );
}
