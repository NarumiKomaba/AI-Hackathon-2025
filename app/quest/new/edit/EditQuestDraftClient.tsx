"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getFirebaseFirestore } from "@/lib/firebaseClient";
import { doc, getDoc, collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import ProjectQuestLayout from "@/components/layout/ProjectQuestLayout";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";

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

type DraftDoc = QuestDraft & {
  tempProjectId?: string;
};

function EditQuestDraftInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId");

  const [draft, setDraft] = useState<DraftDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchDraft = async () => {
      if (!draftId) {
        setMessage("draftId が指定されていません。");
        setLoading(false);
        return;
      }

      try {
        const db = getFirebaseFirestore();
        const draftRef = doc(db, "projectDrafts", draftId);
        const snap = await getDoc(draftRef);

        if (!snap.exists()) {
          setMessage("指定されたクエスト案が見つかりませんでした。");
          setLoading(false);
          return;
        }

        const data = snap.data() as Partial<DraftDoc>;
        setDraft({
          title: data.title ?? "",
          durationDays: data.durationDays ?? 30,
          objective: data.objective ?? "",
          conditions: data.conditions ?? [],
          deliverables: data.deliverables ?? [],
          summary: data.summary ?? "",
          rewards: data.rewards ?? [],
          expGains: data.expGains ?? [],
          tempProjectId: data.tempProjectId,
        });
      } catch (err) {
        console.error("fetchDraft error:", err);
        setMessage("クエスト案の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchDraft();
  }, [draftId]);

  const handleSaveAsProject = async () => {
    if (!draft) return;

    setSaving(true);
    setMessage("");

    try {
      const db = getFirebaseFirestore();
      const projectsCol = collection(db, "testProjects");

      const now = new Date();
      now.setDate(now.getDate() + draft.durationDays);
      const futureTimestamp = Timestamp.fromDate(now);

      const docRef = await addDoc(projectsCol, {
        id: draft.tempProjectId ?? null,
        name: draft.title,
        client_name: null,
        pm_name: null,
        status: "募集中",
        start_date: serverTimestamp(),
        end_date: futureTimestamp,
        overview: draft.summary,
        purpose: draft.objective,
        success_conditions: draft.conditions,
        deliverables: draft.deliverables,
        rewards: draft.rewards,
        experience_gains: draft.expGains,
        created_at: serverTimestamp(),
        update_at: serverTimestamp(),
      });

      setMessage(`クエストとして登録しました！（projectId: ${docRef.id}）`);
      router.push(`/board`);
    } catch (err) {
      console.error("handleSaveAsProject error:", err);
      setMessage("クエストの登録に失敗しました…");
    } finally {
      setSaving(false);
    }
  };

  const headerTitle = useMemo(() => {
    if (!draft) return "（読み込み中）";
    return draft.title?.trim() ? draft.title : "（クエスト名未入力）";
  }, [draft]);

  const cardTitle = (t: string) => (
    <div className="text-sm font-semibold mb-2 text-[#3b2a1a]">{t}</div>
  );

  return (
    <ProjectQuestLayout>
      <LoadingOverlay show={saving} />

      <div className="h-full">
        {/* 全体：上下分割（上：フォーム、下：大ボタン） */}
        <div className="h-full flex flex-col gap-8">
          {/* 上段 */}
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">
                読み込み中...
              </div>
            ) : !draft ? (
              <div className="h-full flex items-center justify-center text-xs text-red-600">
                {message || "クエスト案が読み込めませんでした。"}
              </div>
            ) : (
              <div className="h-full flex flex-col gap-6 min-h-0">
                {/* 先頭：クエスト名帯（横いっぱい） */}
                <div>
                  {cardTitle("クエスト名")}
                  <div className="bg-[#6B4B2A] rounded-md px-4 py-3 text-white text-sm">
                    {headerTitle}
                    <span className="ml-3 text-xs opacity-90">
                      期間 {draft.durationDays} 日
                    </span>
                  </div>
                </div>

                {/* ここから：左右2列（ご指定の並び） */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-min">
                  {/* 1段目：クエスト名（編集）｜期間 */}
                  <div className="flex flex-col min-h-0">
                    {cardTitle("クエスト名（編集）")}
                    <input
                      className="w-full bg-gray-100 rounded-md px-4 py-3 text-sm outline-none"
                      value={draft.title}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev ? { ...prev, title: e.target.value } : prev
                        )
                      }
                      placeholder="例：基幹システム刷新 編"
                    />
                  </div>

                  <div className="flex flex-col min-h-0">
                    {cardTitle("想定期間（日）")}
                    <input
                      type="number"
                      className="w-full bg-gray-100 rounded-md px-4 py-3 text-sm outline-none"
                      value={draft.durationDays}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev
                            ? { ...prev, durationDays: Number(e.target.value) }
                            : prev
                        )
                      }
                    />
                  </div>

                  {/* 2段目：目的｜概要 */}
                  <div className="flex flex-col min-h-0">
                    {cardTitle("目的")}
                    <textarea
                      className="flex-1 min-h-[120px] w-full bg-gray-100 rounded-md px-4 py-3 text-sm resize-none outline-none"
                      value={draft.objective}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev ? { ...prev, objective: e.target.value } : prev
                        )
                      }
                      placeholder="このクエストで達成したいこと"
                    />
                  </div>

                  <div className="flex flex-col min-h-0">
                    {cardTitle("概要")}
                    <textarea
                      className="flex-1 min-h-[120px] w-full bg-gray-100 rounded-md px-4 py-3 text-sm resize-none outline-none"
                      value={draft.summary}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev ? { ...prev, summary: e.target.value } : prev
                        )
                      }
                      placeholder="クエスト全体の要約"
                    />
                  </div>

                  {/* 3段目：達成条件｜報酬 */}
                  <div className="flex flex-col min-h-0">
                    {cardTitle("達成条件")}
                    <textarea
                      className="flex-1 min-h-[80px] w-full bg-gray-100 rounded-md px-4 py-3 text-sm resize-none outline-none"
                      value={draft.conditions.join("\n")}
                      onChange={(e) => {
                        const lines = e.target.value
                          .split(/\r?\n/)
                          .map((s) => s.trim())
                          .filter(Boolean);
                        setDraft((prev) =>
                          prev ? { ...prev, conditions: lines } : prev
                        );
                      }}
                      placeholder={"例：\n要件定義を確定\n主要画面のプロトタイプ作成"}
                    />
                  </div>

                  <div className="flex flex-col min-h-0">
                    {cardTitle("報酬")}
                    <textarea
                      className="flex-1 min-h-[80px] w-full bg-gray-100 rounded-md px-4 py-3 text-sm resize-none outline-none"
                      value={draft.rewards.join("\n")}
                      onChange={(e) => {
                        const lines = e.target.value
                          .split(/\r?\n/)
                          .map((s) => s.trim())
                          .filter(Boolean);
                        setDraft((prev) =>
                          prev ? { ...prev, rewards: lines } : prev
                        );
                      }}
                      placeholder={"例：\nギルド内での評価向上\nノウハウ獲得"}
                    />
                  </div>

                  {/* 4段目：納品対象｜獲得経験値 */}
                  <div className="flex flex-col min-h-0">
                    {cardTitle("納品対象")}
                    <textarea
                      className="flex-1 min-h-[80px] w-full bg-gray-100 rounded-md px-4 py-3 text-sm resize-none outline-none"
                      value={draft.deliverables.join("\n")}
                      onChange={(e) => {
                        const lines = e.target.value
                          .split(/\r?\n/)
                          .map((s) => s.trim())
                          .filter(Boolean);
                        setDraft((prev) =>
                          prev ? { ...prev, deliverables: lines } : prev
                        );
                      }}
                      placeholder={"例：\n設計書\nPoCデモ\n運用手順"}
                    />
                  </div>

                  <div className="flex flex-col min-h-0">
                    {cardTitle("獲得経験値")}
                    <textarea
                      className="flex-1 min-h-[80px] w-full bg-gray-100 rounded-md px-4 py-3 text-sm resize-none outline-none"
                      value={draft.expGains.join("\n")}
                      onChange={(e) => {
                        const lines = e.target.value
                          .split(/\r?\n/)
                          .map((s) => s.trim())
                          .filter(Boolean);
                        setDraft((prev) =>
                          prev ? { ...prev, expGains: lines } : prev
                        );
                      }}
                      placeholder={"例：\n要件定義スキル\n関係者調整スキル"}
                    />
                  </div>
                </div>

                {message && (
                  <p className="text-xs text-gray-700 whitespace-pre-line">
                    {message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 下段：大ボタン */}
          <div className="shrink-0">
            <div className="flex items-center justify-center gap-10">
              <button
                type="button"
                onClick={() => router.push("/board")}
                className="h-14 px-8 rounded-full bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 active:scale-95 transition"
              >
                戻る
              </button>

              <button
                type="button"
                onClick={handleSaveAsProject}
                disabled={saving || loading || !draft}
                className={`h-14 px-10 rounded-full font-semibold text-white active:scale-95 transition ${
                  saving || loading || !draft
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gray-900 hover:bg-gray-800"
                }`}
              >
                {saving ? "登録中..." : "この内容でクエストとして登録"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProjectQuestLayout>
  );
}

export default function EditQuestDraftClient() {
  return (
    <Suspense fallback={<div className="p-6">読み込み中...</div>}>
      <EditQuestDraftInner />
    </Suspense>
  );
}
