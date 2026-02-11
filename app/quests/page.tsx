"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  due: string; // "YYYY-MM-DD"
  status: "未着手" | "進行中" | "完了";
  progress: number; // 0-100
  parentId: string;    // 行のID（env / prod / future など）
  parentLabel: string; // 行に表示する名前（環境構築 / 本番利用に向けた検証 など）
};

type TabKey = "progress" | "gantt" | "tasks";

type GuildMasterMood = "smile" | "normal" | "strict";

type GuildMasterCommentResponse = {
  comment: string;
  mood: GuildMasterMood;
};

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
      due: "2025-12-03",
      status: "進行中",
      progress: 20,
      parentId: "env",
      parentLabel: "環境構築",
    },
    {
      id: "dir-env",
      title: "DIR 環境",
      owner: "大和",
      due: "2025-12-03",
      status: "進行中",
      progress: 60,
      parentId: "env",
      parentLabel: "環境構築",
    },
    {
      id: "dynamo-env",
      title: "DynamoAI 環境構築",
      owner: "小﨑",
      due: "2025-12-06",
      status: "進行中",
      progress: 40,
      parentId: "env",
      parentLabel: "環境構築",
    },
    {
      id: "prod-test",
      title: "本番利用に向けた検証",
      owner: "駒場",
      due: "2025-12-07",
      status: "完了",
      progress: 100,
      parentId: "prod",
      parentLabel: "本番利用に向けた検証",
    },
    {
      id: "safety",
      title: "セーフティ",
      owner: "未選択",
      due: "2025-12-09",
      status: "未着手",
      progress: 0,
      parentId: "future",
      parentLabel: "今後の発展に向けた検証",
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
      parentId: "research",
      parentLabel: "要件整理・ヒアリング",
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
      parentId: "eval",
      parentLabel: "検証タスク",
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
  const [gmComment, setGmComment] = useState<string>("");
  const [gmMood, setGmMood] = useState<GuildMasterMood>("normal");
  const [gmLoading, setGmLoading] = useState(false);
  const [gmError, setGmError] = useState<string>("");

  const selectedQuest = QUESTS.find((q) => q.id === selectedQuestId)!;
  const detail = QUEST_DETAILS.find((d) => d.questId === selectedQuestId)!;
  const tasks = TASKS_BY_QUEST[selectedQuestId] ?? [];

  // ▼▼▼ ここに追加：選択クエストが変わったらAIで一言生成 ▼▼▼
  useEffect(() => {
    let canceled = false;

    async function run() {
      setGmError("");
      setGmLoading(true);

      setGmComment(detail.guildMasterComment);
      setGmMood("normal");

      try {
        const res = await fetch("/api/guildmaster-comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questTitle: selectedQuest.title,
            recommendedLevel: selectedQuest.recommendedLevel,
            elapsedDays: selectedQuest.elapsedDays,
            status: selectedQuest.status,
            metrics: detail.metrics,
            debuffs: detail.debuffs,
            tasks: tasks.map((t) => ({
              title: t.title,
              owner: t.owner,
              due: t.due,
              status: t.status,
              progress: t.progress,
            })),
          }),
        });

        const json: unknown = await res.json();

        if (!res.ok) {
          const msg =
            typeof json === "object" && json !== null
              ? String(
                (json as { detail?: unknown; error?: unknown }).detail ??
                (json as { detail?: unknown; error?: unknown }).error ??
                "failed"
              )
              : "failed";
          throw new Error(msg);
        }

        const data = json as Partial<GuildMasterCommentResponse>;

        const comment = typeof data.comment === "string" ? data.comment : "";
        const mood: GuildMasterMood =
          data.mood === "smile" || data.mood === "strict" || data.mood === "normal"
            ? data.mood
            : "normal";

        if (!canceled) {
          setGmComment(comment.trim());
          setGmMood(mood);
        }
      } catch (e: unknown) {
        if (!canceled) setGmError(getErrorMessage(e));
      } finally {
        if (!canceled) setGmLoading(false);
      }
    }

    run();
    return () => {
      canceled = true;
    };
  }, [selectedQuestId]); // ★ クエスト切替で生成
  // ▲▲▲ ここまで追加 ▲▲▲


  return (
    <ProjectQuestLayout>
      <div className="h-full flex gap-6 px-10">
        {/* 左：参加中クエストリスト（青いメニュー） */}
        <aside className="relative w-80 flex-shrink-0 overflow-visible">
          <div className="pointer-events-none absolute top-[-12px] bottom-[-12px] left-[2px] right-[2px]">
            <Image
              src="/images/blue-back.png"
              alt="メニュー背景"
              fill
              sizes="320px"
              className="object-fill"
            />
          </div>

          <div className="relative z-10 flex flex-col h-full px-6 py-8">
            <h2 className="text-lg font-semibold mb-4 text-white">
              参加中クエスト
            </h2>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {QUESTS.map((quest) => {
                const isActive = quest.id === selectedQuestId;

                const statusClass =
                  quest.status === "進行中"
                    ? "bg-[#B8301A] text-white"
                    : quest.status === "未着手"
                      ? "bg-[#777777] text-white"
                      : "bg-[#004A80] text-white";

                return (
                  <button
                    key={quest.id}
                    type="button"
                    onClick={() => setSelectedQuestId(quest.id)}
                    className="relative w-full h-28 text-left"
                  >
                    <Image
                      src={isActive ? "/images/Group 54.png" : "/images/Group 40.png"}
                      alt={quest.title}
                      fill
                      sizes="320px"
                      className="object-fill"
                    />

                    <div className="absolute inset-0 px-5 py-5 flex flex-col justify-between">
                      <div>
                        <div
                          className={
                            "text-sm font-semibold " +
                            (isActive ? "text-white" : "text-gray-900")
                          }
                        >
                          {quest.title}
                        </div>
                        <div
                          className={
                            "text-[11px] mt-1 " +
                            (isActive ? "text-white/90" : "text-gray-700")
                          }
                        >
                          推奨Lv{quest.recommendedLevel} / 経過{quest.elapsedDays}日
                        </div>
                      </div>

                      <div className="mt-1">
                        <span
                          className={`inline-block px-3 py-1 text-[11px] rounded-full ${statusClass}`}
                        >
                          {quest.status}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* 右：見出し＋タブ＋内容＋提出ボタン */}
        <section className="flex-1 flex flex-col">
          {/* 見出しボード（お手本ページと同じ構成） */}
          <div className="relative h-20 mb-4 shrink-0">
            <Image
              src="/images/見出し@144x.png"
              alt="見出し"
              fill
              sizes="1200px"
              className="object-contain"
            />
            <div className="absolute inset-0 flex flex-col justify-center px-12">
              <div className="text-base font-bold text-white">
                {selectedQuest.title}
              </div>
              <div className="text-xs text-white mt-1">
                推奨Lv{selectedQuest.recommendedLevel} / 経過
                {selectedQuest.elapsedDays}日
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {/* タブ行：下端をそろえる＋余計な余白なし */}
            <div className="flex items-end gap-2 px-8 pt-3 pb-0">
              <TabButton
                label="進捗状況"
                active={activeTab === "progress"}
                onClick={() => setActiveTab("progress")}
              />
              <TabButton
                label="スケジュール"
                active={activeTab === "gantt"}
                onClick={() => setActiveTab("gantt")}
              />
              <TabButton
                label="タスクリスト"
                active={activeTab === "tasks"}
                onClick={() => setActiveTab("tasks")}
              />
            </div>

            {/* コンテンツ：タブ直下から開始（ベージュ背景） */}
            <div className="px-8 pt-0 pb-6 bg-[#F7F1E3] mt-[-7px] h-[490px]">
              {activeTab === "progress" && (
                <div className="h-full overflow-y-auto pr-1">
                  <ProgressView
                    detail={detail}
                    guildMasterComment={gmComment}
                    mood={gmMood}
                    loading={gmLoading}
                    error={gmError}
                  />
                </div>
              )}
              {activeTab === "gantt" && (
                <GanttView tasks={tasks} />
              )}
              {activeTab === "tasks" && (
                <div className="h-full overflow-y-auto pr-1">
                  <TaskListView key={selectedQuestId} tasks={tasks} />
                </div>
              )}
            </div>

            {/* ギルドマスターに提出ボタン（ベージュの外・右寄せ） */}
            <div className="w-full flex justify-end gap-4 pt-3">
              <button
                type="button"
                onClick={() => router.push(`/quests/${selectedQuestId}/report`)}
                className="relative h-16 md:h-20 flex items-center justify-center px-6 py-2 bg-[#5C3B23] text-white font-bold rounded-lg shadow-lg hover:bg-[#7A4E33] transition-colors"
                title="AI評議会へ移動"
              >
                <span className="text-xl mr-2">🏰</span>
                <div className="text-left leading-tight">
                  <div className="text-sm opacity-80">Guild Council</div>
                  <div className="text-lg">評議会へ</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/quest/submit?questId=${selectedQuestId}`)}
                className="relative w-70 h-16 md:w-66 md:h-20 cursor-pointer"
              >
                <Image
                  src="/images/sub-blue.png"
                  alt="ギルドマスターに提出"
                  fill
                  sizes="264px"
                  className="object-contain"
                />
              </button>
            </div>

          </div>
        </section>
      </div>
    </ProjectQuestLayout>
  );
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

// -------------------- サブコンポーネント --------------------

function TabButton(props: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="relative w-40 h-11 md:w-48 md:h-12 flex-shrink-0 cursor-pointer"
    >
      <Image
        src={props.active ? "/images/Group 58.png" : "/images/Group 59.png"}
        alt={props.label}
        fill
        sizes="200px"
        className="object-contain"
      />
      <span
        className={
          "absolute inset-0 flex items-center justify-center text-sm font-semibold " +
          (props.active ? "text-white" : "text-[#5C3B23]")
        }
      >
        {props.label}
      </span>
    </button>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-[#8A4B26] border-b-2 border-[#8A4B26] pb-1 mb-3">
      {children}
    </h3>
  );
}

function ProgressView({
  detail,
  guildMasterComment,
  mood,
  loading,
  error,
}: {
  detail: QuestDetail;
  guildMasterComment: string;
  mood: GuildMasterMood;
  loading: boolean;
  error: string;
}) {
  const masterSrc =
    mood === "smile"
      ? "/images/master_smile.png"
      : mood === "strict"
        ? "/images/master.png"
        : "/images/master_smile.png";

  return (
    <div className="flex flex-col gap-6 pt-4">
      {/* 上段：進行状況 vs デバフ */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* 左：ドーナツ3つ（大きめ） */}
        <div className="md:w-2/3">
          <SectionHeading>進行状況</SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
          <SectionHeading>状態異常（デバフ）</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {detail.debuffs.map((d) => (
              <span
                key={d.id}
                className="inline-flex items-center px-3 py-1 rounded-full border border-[#0071A9] text-[11px] text-[#0071A9] bg-white"
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ギルドマスターコメント */}
      <div>
        <div className="flex items-stretch gap-6 bg-[#8A2F2F] rounded-xl px-4 text-white">
          {/* ギルドマスター画像：さらに大きく */}
          <div className="relative w-40 h-40 md:w-44 md:h-44 flex-shrink-0">
            <Image
              src={masterSrc}
              alt="ギルドマスター"
              fill
              sizes="176px"
              className="object-contain"
            />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-base md:text-lg font-semibold mb-2 border-b border-white pb-1">
              ギルドマスターの一言
            </div>
            <p className="text-xs md:text-sm leading-relaxed whitespace-pre-line">
              {loading ? "…ふむふむ、、このプロジェクトの状況はどうかな。" : guildMasterComment}
              {error ? `\n（生成失敗：${error}）` : ""}
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
    <div className="relative w-28 h-28 md:w-32 md:h-32">
      <div
        className="w-full h-full rounded-full"
        style={{
          background: `conic-gradient(#0071A9 ${deg}deg, #e5e5e5 0deg)`,
        }}
      />
      <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center">
        <span className="text-xl font-semibold text-gray-900">
          {clamped}%
        </span>
      </div>
    </div>
  );
}

const DAY_COLUMN_WIDTH = 56;      // 日付列の横幅
const LABEL_COLUMN_WIDTH = 220;   // 左ラベルの横幅

function GanttView({ tasks }: { tasks: Task[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ---- Hook は先に定義しておく ----
  const parsedTasks = tasks.map((t) => ({
    ...t,
    dueDate: new Date(t.due),
  }));

  // プロジェクト開始〜終了に、今日も必ず含めた日付リスト
  const dayList: Date[] = (() => {
    if (parsedTasks.length === 0) return [];

    const projectMinTs = Math.min(...parsedTasks.map((t) => t.dueDate.getTime()));
    const projectMaxTs = Math.max(...parsedTasks.map((t) => t.dueDate.getTime()));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let minTs = projectMinTs;
    let maxTs = projectMaxTs;

    if (today.getTime() < minTs) minTs = today.getTime();
    if (today.getTime() > maxTs) maxTs = today.getTime();

    const minDate = new Date(minTs);
    const maxDate = new Date(maxTs);

    const arr: Date[] = [];
    const cursor = new Date(minDate);
    while (cursor <= maxDate) {
      arr.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return arr;
  })();

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // 親タスク行
  const parentMap = new Map<string, string>();
  parsedTasks.forEach((t) => {
    if (!parentMap.has(t.parentId)) parentMap.set(t.parentId, t.parentLabel);
  });
  const parentRows = Array.from(parentMap.entries()).map(([id, label]) => ({
    id,
    label,
  }));

  // ★ 今日の列が左側に来るようにスクロール（ラベル幅も加味）
  useEffect(() => {
    if (!scrollRef.current || dayList.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const idx = dayList.findIndex((d) => isSameDay(d, today));
    if (idx >= 0) {
      const offset = LABEL_COLUMN_WIDTH + idx * DAY_COLUMN_WIDTH;
      scrollRef.current.scrollLeft = offset;
    } else {
      scrollRef.current.scrollLeft = 0;
    }
  }, [dayList.length]);

  if (tasks.length === 0) {
    return (
      <div className="h-full pt-4 text-xs text-gray-500">
        このクエストにはスケジュール対象のタスクがまだありません。
      </div>
    );
  }

  const columnTemplate = `${LABEL_COLUMN_WIDTH}px repeat(${dayList.length}, ${DAY_COLUMN_WIDTH}px)`;
  const formatDayLabel = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* 背景少し濃いめに */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto rounded-lg"
      >
        <div className="min-w-full">
          {/* 日付ヘッダー */}
          <div
            className="grid text-[11px]"
            style={{ gridTemplateColumns: columnTemplate }}
          >
            <div className="px-3 py-2">&nbsp;</div>

            {dayList.map((d, idx) => (
              <div
                key={d.toISOString()}
                className={
                  "px-1 py-2 text-center " +
                  (idx % 2 === 1 ? "bg-[#FAF1DD]" : "bg-[#F3E0C3]")
                }
              >
                <div className="font-semibold leading-tight">
                  {formatDayLabel(d)}
                </div>
              </div>
            ))}
          </div>

          {/* 親タスクごとの行 */}
          {parentRows.map((row) => {
            const rowTasks = parsedTasks.filter((t) => t.parentId === row.id);

            return (
              <div
                key={row.id}
                className="grid"
                style={{ gridTemplateColumns: columnTemplate }}
              >
                {/* 左ラベル */}
                <div className="px-3 py-3 text-sm text-[#5C3B23] whitespace-nowrap">
                  {row.label}
                </div>

                {/* 日付セル */}
                {dayList.map((day, idx) => {
                  const dateKey =
                    day.getFullYear() +
                    "-" +
                    String(day.getMonth() + 1).padStart(2, "0") +
                    "-" +
                    String(day.getDate()).padStart(2, "0");

                  const tasksOnThisDay = rowTasks.filter(
                    (t) => t.due === dateKey
                  );
                  const striped = idx % 2 === 1;

                  return (
                    <div
                      key={day.toISOString()}
                      className={
                        "relative " +
                        (striped ? "bg-[#FAF1DD]" : "bg-[#F3E0C3]")
                      }
                    >
                      {/* ガイド線：1px・薄めに */}
                      <div className="absolute left-0 right-0 top-1/2 border-t border-[#B58A5C]" />

                      <div className="relative flex justify-center items-center h-11">
                        {tasksOnThisDay.map((task) => (
                          <GanttDotWithTooltip key={task.id} task={task} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* ★ 一番下のバーは削除済み */}
        </div>
      </div>
    </div>
  );
}

function GanttDotWithTooltip({ task }: { task: Task }) {
  const statusColor =
    task.status === "完了"
      ? "bg-[#1C7C3B]" // グリーン
      : task.status === "進行中"
        ? "bg-[#0071A9]" // ブルー
        : "bg-[#C4C4C4]"; // グレー（未着手）

  return (
    <div className="relative group">
      {/* 〇：大きめ＋線の少し下に */}
      <div
        className={
          "w-4 h-4 rounded-full border border-white shadow cursor-pointer " +
          statusColor
        }
        style={{ marginTop: "3px" }}
      />

      {/* 吹き出し */}
      <div className="pointer-events-none invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute z-20 top-6 left-1/2 -translate-x-1/2">
        <div className="bg-[#F5E9D7] text-[#5C3B23] text-[11px] rounded-lg shadow-lg px-3 py-2 w-56">
          <div className="font-semibold mb-1">{task.title}</div>
          <div className="leading-snug mb-1">
            担当: <span className="font-medium">{task.owner}</span>
          </div>
          <div className="leading-snug mb-2">期限: {task.due}</div>
          <div className="inline-block px-2 py-[2px] rounded-full bg-[#5C2B19] text-white text-[10px]">
            {task.status}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskListView({ tasks }: { tasks: Task[] }) {
  const PAGE_SIZE = 6;

  const [localTasks, setLocalTasks] = useState<Task[]>(() => tasks);

  const [page, setPage] = useState(0);
  const [ownerFilter, setOwnerFilter] = useState<string>("ALL");
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);

  const toggleStatus = (id: string) => {
    setLocalTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;

        if (t.status === "未着手") {
          return { ...t, status: "進行中", progress: Math.max(t.progress, 10) };
        }
        if (t.status === "進行中") {
          return { ...t, status: "完了", progress: 100 };
        }
        return t;
      })
    );
  };

  // 担当者一覧（ユニーク）
  const owners = Array.from(
    new Set(localTasks.map((t) => t.owner).filter(Boolean))
  );

  // フィルタ後のタスク
  const filteredTasks =
    ownerFilter === "ALL"
      ? localTasks
      : localTasks.filter((t) => t.owner === ownerFilter);

  // ページング（フィルタ後の件数で計算）
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  const pageTasks = filteredTasks.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  const canPrev = safePage > 0;
  const canNext = safePage < totalPages - 1;

  return (
    // ★ 進捗状況と同じ “pt-4 + gap” に寄せる
    <div className="h-full flex flex-col gap-3 pt-4">
      {/* 見出し行（ProgressView と同じ SectionHeading 構成） */}
      <div className="flex items-center justify-between">
        <SectionHeading>今週のクエスト達成状況</SectionHeading>
        <p className="text-xs text-gray-500">
          {safePage + 1}/{totalPages} ページ（全 {filteredTasks.length} 件）
        </p>
      </div>

      {/* ★ 見出し直下：担当者絞り込みボタン */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOwnerMenuOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#C9A57A] text-[12px] text-[#5C3B23] shadow-sm"
        >
          <span className="font-semibold">担当者で絞り込み</span>
          <span className="px-2 py-[2px] rounded-full bg-[#F1DFC1] border border-[#C9A57A] text-[11px]">
            {ownerFilter === "ALL" ? "全員" : ownerFilter}
          </span>
          <span className="text-[12px]">▾</span>
        </button>

        {ownerMenuOpen && (
          <div className="absolute z-20 mt-2 w-56 rounded-lg border border-[#C9A57A] bg-white shadow-lg overflow-hidden">
            <button
              type="button"
              className={
                "w-full text-left px-3 py-2 text-[12px] hover:bg-[#F7F1E3] " +
                (ownerFilter === "ALL" ? "font-semibold text-[#5C3B23]" : "text-[#5C3B23]")
              }
              onClick={() => {
                setOwnerFilter("ALL");
                setPage(0);
                setOwnerMenuOpen(false);
              }}
            >
              全員
            </button>

            <div className="h-px bg-[#E7D1AF]" />

            {owners.map((o) => (
              <button
                key={o}
                type="button"
                className={
                  "w-full text-left px-3 py-2 text-[12px] hover:bg-[#F7F1E3] " +
                  (ownerFilter === o ? "font-semibold text-[#5C3B23]" : "text-[#5C3B23]")
                }
                onClick={() => {
                  setOwnerFilter(o);
                  setPage(0);
                  setOwnerMenuOpen(false);
                }}
              >
                {o}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* カード領域 */}
      <div className="flex-1 min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() => toggleStatus(task.id)}
            />
          ))}

          {/* 6枚固定の空き枠 */}
          {Array.from({ length: Math.max(0, PAGE_SIZE - pageTasks.length) }).map(
            (_, i) => (
              <div key={`empty-${i}`} className="opacity-0 select-none">
                <div className="h-[150px]" />
              </div>
            )
          )}
        </div>
      </div>

      {/* ページング */}
      {totalPages > 1 && (
        <div className="mt-1 flex items-center justify-center gap-6">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => canPrev && setPage((p) => p - 1)}
            className={
              "relative w-10 h-10 " + (canPrev ? "" : "opacity-30 cursor-default")
            }
            aria-label="前のページ"
          >
            <Image
              src="/images/Group 37.png"
              alt="prev"
              fill
              className="object-contain scale-x-[-1]"
            />
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <span
                key={i}
                className={
                  "inline-block w-2 h-2 rounded-full " +
                  (i === safePage ? "bg-[#0071A9]" : "bg-[#C9A57A]")
                }
              />
            ))}
          </div>

          <button
            type="button"
            disabled={!canNext}
            onClick={() => canNext && setPage((p) => p + 1)}
            className={
              "relative w-10 h-10 " + (canNext ? "" : "opacity-30 cursor-default")
            }
            aria-label="次のページ"
          >
            <Image
              src="/images/Group 37.png"
              alt="next"
              fill
              className="object-contain"
            />
          </button>
        </div>
      )}

      {filteredTasks.length === 0 && (
        <p className="text-xs text-gray-500">
          条件に一致するタスクがありません。
        </p>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: () => void;
}) {
  // 背景：通常 / 完了
  const bgSrc =
    task.status === "完了"
      ? "/images/Subtract (2).png"
      : "/images/Subtract.png";

  // 遅延判定（完了以外 & 期限超過）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due);
  due.setHours(0, 0, 0, 0);
  const isDelayed = task.status !== "完了" && due.getTime() < today.getTime();

  // 右上ラベル（Group19/20/21）
  const topRightLabelSrc = isDelayed
    ? "/images/Group 19.png" // 遅延
    : task.status === "未着手"
      ? "/images/Group 20.png" // 未完了
      : "/images/Group 21.png"; // 順調（進行中 or 完了でもOKならここ）

  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative h-[150px] w-full text-left"
    >
      {/* 背景 */}
      <Image src={bgSrc} alt="task card" fill className="object-fill" />

      <div className="absolute right-5 top-[-7] w-17 h-17">
        <Image src={topRightLabelSrc} alt="label" fill className="object-contain" />
      </div>

      {/* 内容 */}
      <div className="absolute inset-0 px-5 py-4 flex flex-col">
        {/* 題名 */}
        <div className="pr-12 text-[13px] font-semibold text-[#5C3B23] line-clamp-2">
          {task.title}
        </div>

        {/* 題名下の下線 */}
        <div className="mt-1 border-b border-[#C9A57A]" />

        {/* 担当 */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] text-[#5C3B23]">担当</span>
          <span className="inline-flex items-center h-5 px-3 rounded-full bg-white/90 border border-[#C9A57A] text-[11px] text-[#5C3B23]">
            {task.owner}
          </span>
        </div>

        {/* 期限 */}
        <div className="mt-2 text-[11px] text-[#5C3B23]">
          期限 <span className="ml-2">{task.due}</span>
        </div>

        {/* 下段に状態（文字）を出したいならここに追加できるけど、不要とのことなので無し */}
        <div className="mt-auto" />

        {/* 完了スタンプ */}
        {task.status === "完了" && (
          <div className="absolute right-1 top-6 w-28 h-28 rotate-[10deg]">
            <Image
              src="/images/complete.png"
              alt="完了"
              fill
              className="object-contain"
            />
          </div>
        )}
      </div>
    </button>
  );
}
