"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ProjectQuestLayout from "@/components/layout/ProjectQuestLayout";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import { getFirebaseFirestore } from "@/lib/firebaseClient";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

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
};

type Task = {
  id: string;
  title: string;
  owner: string;
  due: string; // "YYYY-MM-DD"
  status: "未着手" | "進行中" | "完了";
  progress: number; // 0-100
  parentId: string;
  parentLabel: string;
};

type TabKey = "progress" | "gantt" | "tasks";

type GuildMasterMood = "smile" | "normal" | "strict";

type GuildMasterCommentResponse = {
  comment: string;
  mood: GuildMasterMood;
};

/* ================================
   Firestore → Quest 変換ヘルパー
================================ */
function computeElapsedDays(startDate: unknown): number {
  if (!startDate) return 0;
  let ms: number;
  if (startDate instanceof Timestamp) {
    ms = startDate.toMillis();
  } else if (typeof startDate === "object" && startDate !== null && "seconds" in startDate) {
    ms = (startDate as { seconds: number }).seconds * 1000;
  } else {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24)));
}

function computeRecommendedLevel(durationDays: number): number {
  if (durationDays <= 30) return Math.max(1, Math.round(durationDays * 0.5));
  if (durationDays <= 90) return Math.round(15 + (durationDays - 30) * 0.35);
  return Math.round(36 + (durationDays - 90) * 0.2);
}

// -------------------- ページコンポーネント --------------------

export default function QuestManagementPage() {
  const router = useRouter();

  // Firestore データ
  const [quests, setQuests] = useState<Quest[]>([]);
  const [tasksByQuest, setTasksByQuest] = useState<Record<string, Task[]>>({});
  const [pageLoading, setPageLoading] = useState(true);

  // 選択状態
  const [selectedQuestId, setSelectedQuestId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabKey>("progress");

  // AI生成: メトリクス・デバフ
  const [questDetails, setQuestDetails] = useState<Record<string, QuestDetail>>({});
  const [metricsLoading, setMetricsLoading] = useState(false);

  // ギルドマスターコメント
  const [gmComment, setGmComment] = useState<string>("");
  const [gmMood, setGmMood] = useState<GuildMasterMood>("normal");
  const [gmLoading, setGmLoading] = useState(false);
  const [gmError, setGmError] = useState<string>("");

  const selectedQuest = quests.find((q) => q.id === selectedQuestId);
  const detail = questDetails[selectedQuestId];
  const tasks = tasksByQuest[selectedQuestId] ?? [];

  // ▼ Firestore からクエスト一覧 + WBSタスクを取得
  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        const db = getFirebaseFirestore();

        // クエスト一覧取得
        const questSnap = await getDocs(collection(db, "testProjects"));
        const fetchedQuests: Quest[] = questSnap.docs.map((doc) => {
          const data = doc.data();
          const elapsed = computeElapsedDays(data.start_date);
          // ステータス判定
          let status: QuestStatus = "未着手";
          if (data.status === "参加中" || data.status === "進行中") {
            status = "進行中";
          } else if (data.status === "期限切れ") {
            status = "期限切れ";
          }
          return {
            id: doc.id,
            title: data.name || data.title || doc.id,
            recommendedLevel: computeRecommendedLevel(elapsed),
            elapsedDays: elapsed,
            status,
          };
        });

        if (cancelled) return;
        setQuests(fetchedQuests);
        if (fetchedQuests.length > 0) {
          setSelectedQuestId(fetchedQuests[0].id);
        }

        // 各クエストのWBSタスクを取得
        const allTasks: Record<string, Task[]> = {};
        for (const q of fetchedQuests) {
          const wbsSnap = await getDocs(
            query(collection(db, "wbs_items"), where("projectId", "==", q.id))
          );
          let wbsTasks = wbsSnap.docs.map((d) => {
            const w = d.data();
            return {
              id: d.id,
              title: w.title || w.name || d.id,
              owner: w.owner || w.assignee || "未選択",
              due: w.due || w.due_date || w.end_date || "未定",
              status: (w.status === "完了" ? "完了" : w.status === "進行中" ? "進行中" : "未着手") as Task["status"],
              progress: typeof w.progress === "number" ? w.progress : (w.status === "完了" ? 100 : 0),
              parentId: w.parentId || w.parent_id || w.category || "default",
              parentLabel: w.parentLabel || w.parent_label || w.category_name || w.title || "タスク",
            };
          });

          // project_id フィールドでも試す
          if (wbsTasks.length === 0) {
            const wbsSnap2 = await getDocs(
              query(collection(db, "wbs_items"), where("project_id", "==", q.id))
            );
            wbsTasks = wbsSnap2.docs.map((d) => {
              const w = d.data();
              return {
                id: d.id,
                title: w.title || w.name || d.id,
                owner: w.owner || w.assignee || "未選択",
                due: w.due || w.due_date || w.end_date || "未定",
                status: (w.status === "完了" ? "完了" : w.status === "進行中" ? "進行中" : "未着手") as Task["status"],
                progress: typeof w.progress === "number" ? w.progress : (w.status === "完了" ? 100 : 0),
                parentId: w.parentId || w.parent_id || w.category || "default",
                parentLabel: w.parentLabel || w.parent_label || w.category_name || w.title || "タスク",
              };
            });
          }

          allTasks[q.id] = wbsTasks;
        }

        if (!cancelled) {
          setTasksByQuest(allTasks);
        }
      } catch (e) {
        console.error("Quests fetch error:", e);
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  // ▼ クエスト選択時: AI メトリクス・デバフ取得
  useEffect(() => {
    if (!selectedQuestId || !selectedQuest) return;
    // キャッシュ済みなら再取得しない
    if (questDetails[selectedQuestId]) return;

    let cancelled = false;
    setMetricsLoading(true);

    async function fetchMetrics() {
      try {
        const res = await fetch("/api/quest-metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: selectedQuestId,
            questTitle: selectedQuest!.title,
          }),
        });

        if (!res.ok) throw new Error("メトリクス取得失敗");
        const data = await res.json();

        if (!cancelled) {
          setQuestDetails((prev) => ({
            ...prev,
            [selectedQuestId]: {
              questId: selectedQuestId,
              metrics: data.metrics || [],
              debuffs: data.debuffs || [],
            },
          }));
        }
      } catch (e) {
        console.error("Quest metrics fetch error:", e);
        if (!cancelled) {
          // フォールバック
          setQuestDetails((prev) => ({
            ...prev,
            [selectedQuestId]: {
              questId: selectedQuestId,
              metrics: [
                { label: "AGI（進捗）", key: "agi", value: 0 },
                { label: "HP（コスト）", key: "hp", value: 0 },
                { label: "EXP（タスク）", key: "exp", value: 0 },
              ],
              debuffs: [],
            },
          }));
        }
      } finally {
        if (!cancelled) setMetricsLoading(false);
      }
    }

    fetchMetrics();
    return () => { cancelled = true; };
  }, [selectedQuestId]);

  // ▼ クエスト選択時: ギルドマスターコメント生成
  useEffect(() => {
    if (!selectedQuestId || !selectedQuest) return;

    let canceled = false;
    setGmError("");
    setGmLoading(true);
    setGmComment("…ふむふむ、このプロジェクトの状況はどうかな。");
    setGmMood("normal");

    async function run() {
      try {
        const res = await fetch("/api/guildmaster-comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: selectedQuestId }),
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
    return () => { canceled = true; };
  }, [selectedQuestId]);


  // ▼ ローディング中
  if (pageLoading) {
    return (
      <ProjectQuestLayout>
        <LoadingOverlay show={true} />
      </ProjectQuestLayout>
    );
  }

  // ▼ クエストが無い場合
  if (quests.length === 0) {
    return (
      <ProjectQuestLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-[#3b2a1a]">
            <p className="text-lg font-semibold mb-2">クエストがまだありません</p>
            <button
              onClick={() => router.push("/quest/new")}
              className="text-sm underline opacity-80 hover:opacity-100"
            >
              新しいクエストを作成する
            </button>
          </div>
        </div>
      </ProjectQuestLayout>
    );
  }

  if (!selectedQuest) return null;

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
              {quests.map((quest) => {
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
          {/* 見出しボード */}
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
            {/* タブ行 */}
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

            {/* コンテンツ */}
            <div className="px-8 pt-0 pb-6 bg-[#F7F1E3] mt-[-7px] h-[490px]">
              {activeTab === "progress" && (
                <div className="h-full overflow-y-auto pr-1">
                  <ProgressView
                    detail={detail}
                    metricsLoading={metricsLoading}
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

            {/* ギルドマスターに提出ボタン */}
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
  metricsLoading,
  guildMasterComment,
  mood,
  loading,
  error,
}: {
  detail: QuestDetail | undefined;
  metricsLoading: boolean;
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

  const metrics = detail?.metrics ?? [
    { label: "AGI（進捗）", key: "agi" as const, value: 0 },
    { label: "HP（コスト）", key: "hp" as const, value: 0 },
    { label: "EXP（タスク）", key: "exp" as const, value: 0 },
  ];
  const debuffs = detail?.debuffs ?? [];

  return (
    <div className="flex flex-col gap-6 pt-4">
      {/* 上段：進行状況 vs デバフ */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* 左：ドーナツ3つ */}
        <div className="md:w-2/3">
          <SectionHeading>進行状況</SectionHeading>
          {metricsLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-[#5C3B23] animate-pulse">AIが分析中…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {metrics.map((m) => (
                <div key={m.key} className="flex flex-col items-center gap-2">
                  <Donut value={m.value} />
                  <div className="text-sm font-medium text-gray-800">
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右：デバフ */}
        <div className="md:w-1/3">
          <SectionHeading>状態異常（デバフ）</SectionHeading>
          {metricsLoading ? (
            <p className="text-sm text-[#5C3B23] animate-pulse">分析中…</p>
          ) : debuffs.length === 0 ? (
            <p className="text-xs text-gray-500">状態異常なし</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {debuffs.map((d) => (
                <span
                  key={d.id}
                  className="inline-flex items-center px-3 py-1 rounded-full border border-[#0071A9] text-[11px] text-[#0071A9] bg-white"
                >
                  {d.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ギルドマスターコメント */}
      <div>
        <div className="flex items-stretch gap-6 bg-[#8A2F2F] rounded-xl px-4 text-white">
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
              {loading ? "…ふむふむ、このプロジェクトの状況はどうかな。" : guildMasterComment}
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

const DAY_COLUMN_WIDTH = 56;
const LABEL_COLUMN_WIDTH = 220;

function GanttView({ tasks }: { tasks: Task[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const parsedTasks = tasks.map((t) => ({
    ...t,
    dueDate: new Date(t.due),
  }));

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

  const parentMap = new Map<string, string>();
  parsedTasks.forEach((t) => {
    if (!parentMap.has(t.parentId)) parentMap.set(t.parentId, t.parentLabel);
  });
  const parentRows = Array.from(parentMap.entries()).map(([id, label]) => ({
    id,
    label,
  }));

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
                <div className="px-3 py-3 text-sm text-[#5C3B23] whitespace-nowrap">
                  {row.label}
                </div>

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
        </div>
      </div>
    </div>
  );
}

function GanttDotWithTooltip({ task }: { task: Task }) {
  const statusColor =
    task.status === "完了"
      ? "bg-[#1C7C3B]"
      : task.status === "進行中"
        ? "bg-[#0071A9]"
        : "bg-[#C4C4C4]";

  return (
    <div className="relative group">
      <div
        className={
          "w-4 h-4 rounded-full border border-white shadow cursor-pointer " +
          statusColor
        }
        style={{ marginTop: "3px" }}
      />

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

  const owners = Array.from(
    new Set(localTasks.map((t) => t.owner).filter(Boolean))
  );

  const filteredTasks =
    ownerFilter === "ALL"
      ? localTasks
      : localTasks.filter((t) => t.owner === ownerFilter);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  const pageTasks = filteredTasks.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  const canPrev = safePage > 0;
  const canNext = safePage < totalPages - 1;

  return (
    <div className="h-full flex flex-col gap-3 pt-4">
      <div className="flex items-center justify-between">
        <SectionHeading>今週のクエスト達成状況</SectionHeading>
        <p className="text-xs text-gray-500">
          {safePage + 1}/{totalPages} ページ（全 {filteredTasks.length} 件）
        </p>
      </div>

      {/* 担当者絞り込み */}
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
  const bgSrc =
    task.status === "完了"
      ? "/images/Subtract (2).png"
      : "/images/Subtract.png";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due);
  due.setHours(0, 0, 0, 0);
  const isDelayed = task.status !== "完了" && due.getTime() < today.getTime();

  const topRightLabelSrc = isDelayed
    ? "/images/Group 19.png"
    : task.status === "未着手"
      ? "/images/Group 20.png"
      : "/images/Group 21.png";

  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative h-[150px] w-full text-left"
    >
      <Image src={bgSrc} alt="task card" fill className="object-fill" />

      <div className="absolute right-5 top-[-7] w-17 h-17">
        <Image src={topRightLabelSrc} alt="label" fill className="object-contain" />
      </div>

      <div className="absolute inset-0 px-5 py-4 flex flex-col">
        <div className="pr-12 text-[13px] font-semibold text-[#5C3B23] line-clamp-2">
          {task.title}
        </div>

        <div className="mt-1 border-b border-[#C9A57A]" />

        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] text-[#5C3B23]">担当</span>
          <span className="inline-flex items-center h-5 px-3 rounded-full bg-white/90 border border-[#C9A57A] text-[11px] text-[#5C3B23]">
            {task.owner}
          </span>
        </div>

        <div className="mt-2 text-[11px] text-[#5C3B23]">
          期限 <span className="ml-2">{task.due}</span>
        </div>

        <div className="mt-auto" />

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
