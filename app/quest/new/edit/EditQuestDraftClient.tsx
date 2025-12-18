"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getFirebaseFirestore } from "@/lib/firebaseClient";
import { doc, getDoc, collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import ProjectQuestLayout from "@/components/layout/ProjectQuestLayout";
import { useRouter } from "next/navigation";

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

export default function EditQuestDraftClient() {
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

      // 現在時刻（クライアント）
      const now = new Date();

      // 日数を加算
      now.setDate(now.getDate() + draft.durationDays);
      // Firestore Timestamp に変換
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
        update_at:serverTimestamp(),
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

  return (
    <ProjectQuestLayout>
      <div className="h-full px-8 py-6">
        {/* メインコンテナを画面の高さに固定 */}
        <div className="max-h-full bg-[#fdfaf1] rounded-xl shadow-[0_4px_20px_rgba(65,43,21,0.2)] border border-orange-200/50 px-8 py-6 flex flex-col gap-6 overflow-auto custom-scrollbar">
           {/* ヘッダ */}
          <div className="flex items-baseline justify-between gap-4 border-b border-orange-200/50 pb-4">
            <div>
              <h1 className="text-lg font-semibold mb-1 text-amber-900">クエスト案の編集</h1>
              <p className="text-xs text-gray-800/80">
                ギルドマスターが生成したクエスト案を確認・編集し、
                問題なければ正式なクエストとして登録します。
              </p>
            </div>
            {draftId && (
              <p className="text-[11px] text-gray-400">
                draftId: <span className="font-mono">{draftId}</span>
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-gray-500">
              クエスト案を読み込んでいます…
            </div>
          ) : !draft ? (
            <div className="flex-1 flex items-center justify-center text-xs text-red-500">
              {message || "クエスト案が読み込めませんでした。"}
            </div>
          ) : (
            <>
              {/* タイトル & 期間 */}
              <div className="flex flex-col gap-3">
                {/* クエスト名 */}
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    クエスト名
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    value={draft.title}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, title: e.target.value } : prev
                      )
                    }
                  />
                </div>

                {/* 想定期間 */}
                <div className="w-64">
                  <label className="block text-sm font-semibold mb-1">
                    想定期間（日）
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    value={draft.durationDays}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              durationDays: Number(e.target.value),
                            }
                          : prev
                      )
                    }
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    ざっくりで構いません。7〜180日くらいを目安にしてください。
                  </p>
                </div>
              </div>

              {/* 2列レイアウト本体 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 ">
                {/* 左列：目的・達成条件・納品対象 */}
                <div className="space-y-4">
                  {/* 目的 */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      目的
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded px-3 py-2 text-xs leading-relaxed min-h-[120px] custom-scrollbar"
                      value={draft.objective}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev
                            ? { ...prev, objective: e.target.value }
                            : prev
                        )
                      }
                    />
                  </div>

                  {/* 達成条件 */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      達成条件（1行につき1つ）
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded px-3 py-2 text-xs leading-relaxed min-h-[120px] custom-scrollbar"
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
                    />
                  </div>

                  {/* 納品対象 */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      納品対象（1行につき1つ）
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded px-3 py-2 text-xs leading-relaxed min-h-[120px] custom-scrollbar"
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
                    />
                  </div>
                </div>

                {/* 右列：概要・報酬・獲得経験値 */}
                <div className="space-y-4">
                  {/* 概要 */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      概要
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded px-3 py-2 text-xs leading-relaxed min-h-[120px] custom-scrollbar"
                      value={draft.summary}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev ? { ...prev, summary: e.target.value } : prev
                        )
                      }
                    />
                  </div>

                  {/* 報酬 */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      報酬（1行につき1つ）
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded px-3 py-2 text-xs leading-relaxed min-h-[120px] custom-scrollbar"
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
                    />
                  </div>

                  {/* 獲得経験値 */}
                  <div>
                    <label className="block text-sm font-semibold mb-1 ">
                      獲得経験値（1行につき1つ）
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded px-3 py-2 text-xs leading-relaxed min-h-[120px] custom-scrollbar"
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
                    />
                  </div>
                </div>
              </div>

              {/* メッセージ */}
              {message && (
                <p className="text-xs text-gray-700 whitespace-pre-line">
                  {message}
                </p>
              )}

              {/* 登録ボタン */}
              <div className="pt-4 border-t border-orange-200/50">
                <button
                  type="button"
                  onClick={handleSaveAsProject}
                  disabled={saving}
                  className={`w-56 py-3 rounded-full text-sm font-semibold shadow-md transition-transform active:scale-95 ${
                    saving
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {saving ? "クエスト登録中..." : "この内容でクエストとして登録"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ProjectQuestLayout>
  );
}