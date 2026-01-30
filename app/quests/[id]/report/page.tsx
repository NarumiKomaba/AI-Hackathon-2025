"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import ProjectQuestLayout from "@/components/layout/ProjectQuestLayout";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebaseClient";

// --- Types ---
type CouncilLog = {
    speakerId: "pmo" | "manager" | "sales" | "super_pm" | "user" | "cto" | "ux";
    message: string;
    actionPlan?: string;
};

type AssumedQA = {
    question: string;
    answer: string;
    askedBy: string;
};

type QuestData = {
    title: string;
    status: string;
    metrics: {
        agi: number;
        hp: number;
        exp: number;
    };
};

const MEMBER_IMAGES: Record<string, string> = {
    pmo: "/images/council_pmo.png",
    manager: "/images/council_manager.png",
    sales: "/images/council_sales.png",
    super_pm: "/images/master_smile.png",
    cto: "/images/council_cto.png",
    ux: "/images/council_ux.png",
    sre: "/images/council_sre.png",
    genba: "/images/council_genba.png",
};

const MEMBER_NAMES: Record<string, string> = {
    pmo: "機律 厳 (PMO)",
    manager: "板挟 課長",
    sales: "調子 良い子",
    super_pm: "ギルドマスター",
    cto: "技術 廃人 (CTO)",
    ux: "映え 命 (UX)",
    sre: "堅牢 基盤 (SRE)",
    genba: "現場 守 (Genba)",
};

const SUMMON_TARGETS = [
    { id: "pmo", label: "品質" },
    { id: "sales", label: "売上" },
    { id: "manager", label: "予算" },
    { id: "cto", label: "技術" },
    { id: "ux", label: "UX" },
    { id: "sre", label: "基盤" },
    { id: "genba", label: "現場" },
];

export default function CouncilRoomPage() {
    const params = useParams();
    const questId = "core-system"; // 暫定的に固定: params.id as string;
    const bottomRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [logs, setLogs] = useState<CouncilLog[]>([]);
    const [questData, setQuestData] = useState<QuestData | null>(null);
    const [userInput, setUserInput] = useState("");
    const [summonId, setSummonId] = useState<string | null>(null);
    const [adoptedActions, setAdoptedActions] = useState<CouncilLog[]>([]);
    const [qaList, setQaList] = useState<AssumedQA[]>([]);

    // Firestoreからクエスト情報取得
    useEffect(() => {
        if (!questId) return;
        setFetchError(null);
        const db = getFirestore(getFirebaseApp());
        getDoc(doc(db, "quests", questId))
            .then((snap) => {
                if (snap.exists()) {
                    setQuestData(snap.data() as QuestData);
                } else {
                    setFetchError(`クエスト「${questId}」が見つかりませんでした。Firestoreにデータがあるか確認してください。`);
                }
            })
            .catch((err) => {
                console.error("Fetch Error:", err);
                setFetchError(`データの取得に失敗しました: ${err.message}`);
            });
    }, [questId]);

    // オートスクロール
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const runMeeting = async (topic?: string) => {
        if (!questData) return;
        setLoading(true);

        let currentLogs = logs;
        if (!topic) {
            setLogs([]); // 初回のみリセット
            currentLogs = [];
        } else {
            // ユーザーの発言をログに追加
            const userLog: CouncilLog = { speakerId: "user", message: topic };
            setLogs(prev => [...prev, userLog]);
            currentLogs = [...logs, userLog];
        }

        try {
            const res = await fetch("/api/council-meeting", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    questTitle: questData.title,
                    status: questData.status,
                    metrics: [
                        { key: "agi", label: "進捗(AGI)", value: questData.metrics?.agi ?? 0 },
                        { key: "hp", label: "予算(HP)", value: questData.metrics?.hp ?? 0 },
                        { key: "exp", label: "完了(EXP)", value: questData.metrics?.exp ?? 0 },
                    ],
                    topic: topic,
                    history: currentLogs.slice(-10), // ユーザーの発言を含めた履歴を送る
                    summonId: summonId, // 選択されたメンバーIDがあれば送る
                }),
            });

            // Reset summonId after sending (optional, or keep generic "sticky" selection?)
            // User requested: "Click to color, then send" -> Likely intended as a one-shot or sticky.
            // Let's keep it sticky for now, or clear it if it interferes.
            // Actually, clearing it feels safer to avoid accidental summons.
            setSummonId(null);

            if (!res.ok) throw new Error("Meeting failed");
            const data = (await res.json()) as CouncilLog[];

            for (const log of data) {
                setLogs((prev) => [...prev, log]);
                await new Promise((r) => setTimeout(r, 1200));
            }

        } catch (e: any) {
            console.error(e);
            const errorMsg = e.message || "Unknown Error";
            setLogs((prev) => [...prev, { speakerId: "super_pm", message: `（通信障害により会議は中断された… 詳細: ${errorMsg}）` }]);
        } finally {
            setLoading(false);
        }
    };

    const discussReport = async () => {
        if (!questData) return;
        setLoading(true);
        setLogs([]); // Reset logs
        setQaList([]); // Reset QA

        try {
            // First, add a starting message
            setLogs([{ speakerId: "super_pm", message: "どれ、提出された報告書をみんなでチェックしようか。何か不備がないか、突っ込まれそうな点はないか、議論してくれたまえ。" }]);

            const res = await fetch("/api/council-report-discussion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId: questId }),
            });

            if (!res.ok) throw new Error("Report Discussion API failed");

            const data = await res.json();
            const discussion = (data.discussion || []) as CouncilLog[];
            const qa = (data.qa || []) as AssumedQA[];

            // Stream discussion logs
            for (const log of discussion) {
                // Determine wait time based on message length
                const wait = Math.min(2000, Math.max(800, log.message.length * 30));
                await new Promise((r) => setTimeout(r, wait));
                setLogs((prev) => [...prev, log]);
            }

            // Set QA List after discussion
            setQaList(qa);

            // Final message from GM
            setLogs((prev) => [...prev, { speakerId: "super_pm", message: "ふむ、議論は出尽くしたようだな。左側のボードに「想定質問と回答案」をまとめておいたぞ。役に立ててくれ。" }]);


        } catch (e: any) {
            console.error(e);
            const errorMsg = e.message || "Unknown Error";
            setLogs((prev) => [...prev, { speakerId: "super_pm", message: `（報告書の読み込みに失敗した… 詳細: ${errorMsg}）` }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || loading) return;

        const userMsg = userInput;
        setUserInput("");
        // ユーザーの発言を擬似的に追加（speakerIdはないが適当に表示するか、お題として送る）
        // ここではAPIに「お題」として送って、AIに反応させる
        runMeeting(userMsg);
    };

    const toggleAdopt = (log: CouncilLog) => {
        // Check if already adopted
        const isAlreadyAdopted = adoptedActions.some(a => a.message === log.message);

        if (isAlreadyAdopted) {
            // Un-adopt
            setAdoptedActions(prev => prev.filter(a => a.message !== log.message));
        } else {
            // Adopt: Trigger conditional approval discussion
            setAdoptedActions(prev => [...prev, log]);
            const adoptMessage = `「${log.actionPlan || log.message}」を採用したい。各メンバーは、自分のコア価値観を守るための条件を提示してくれ。`;
            runMeeting(adoptMessage);
        }
    };

    const askMore = (log: CouncilLog) => {
        setUserInput(`${MEMBER_NAMES[log.speakerId]}さんに、具体的な実行計画について詳しく聞きたい。`);
    };

    return (
        <ProjectQuestLayout>
            <div className="flex h-full p-6 gap-6">
                {/* Left Pane: Status Board (資料) */}
                <div className="w-1/3 bg-[#F7F1E3] rounded-xl border-4 border-[#5C3B23] p-4 shadow-lg flex flex-col">
                    <h2 className="text-xl font-bold text-[#5C3B23] mb-4 border-b-2 border-[#5C3B23] pb-2 text-center">
                        Project Status Board
                    </h2>
                    {questData ? (
                        <div className="space-y-6 flex-1 overflow-y-auto">
                            <div>
                                <div className="text-sm text-gray-600">Quest Title</div>
                                <div className="text-lg font-bold">{questData.title}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <StatusCard label="AGI (Progress)" value={questData.metrics?.agi} color="bg-blue-600" />
                                <StatusCard label="HP (Budget)" value={questData.metrics?.hp} color="bg-green-600" />
                                <StatusCard label="EXP (Tasks)" value={questData.metrics?.exp} color="bg-yellow-500" />
                                <div className="p-3 bg-white rounded border border-gray-300">
                                    <div className="text-xs text-gray-500">Quest Status</div>
                                    <div className="font-bold text-red-600">{questData.status}</div>
                                </div>
                            </div>

                            {/* Assumed Q&A Section */}
                            {qaList.length > 0 && (
                                <div className="mt-8 p-4 bg-white rounded border border-[#5C3B23]/40 shadow-inner">
                                    <h3 className="text-sm text-[#5C3B23] font-bold mb-3 border-b border-[#5C3B23]/20 pb-1">
                                        🧐 想定される鋭い質問
                                    </h3>
                                    <div className="space-y-4">
                                        {qaList.map((qa, i) => (
                                            <div key={i} className="text-xs">
                                                <div className="font-bold text-red-800 mb-1">
                                                    Q. {qa.question} <span className="text-gray-500 font-normal">by {qa.askedBy}</span>
                                                </div>
                                                <div className="bg-blue-50 p-2 rounded text-blue-900 leading-relaxed">
                                                    A. {qa.answer}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 p-4 bg-[#E0D8C8] rounded border border-[#5C3B23]/20">
                                <p className="text-sm text-[#5C3B23] font-bold mb-2 underline">採用されたアクション案:</p>
                                {adoptedActions.length === 0 ? (
                                    <p className="text-xs text-[#5C3B23]/60 italic">まだありません</p>
                                ) : (
                                    <ul className="text-xs text-[#5C3B23] space-y-1 list-disc pl-4">
                                        {adoptedActions.map((action, i) => (
                                            <li key={i} className="leading-relaxed">
                                                <span className="font-bold">[{MEMBER_NAMES[action.speakerId]}]</span> {action.actionPlan || action.message}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ) : fetchError ? (
                        <div className="flex-1 flex items-center justify-center p-6 text-center text-red-600 bg-red-50 rounded-lg border-2 border-red-200">
                            <div>
                                <div className="text-3xl mb-2">⚠️</div>
                                <p className="font-bold">{fetchError}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 italic">
                            <div className="animate-spin text-3xl mb-4">⌛</div>
                            <p>Loading Quest Data...</p>
                        </div>
                    )}

                    <button
                        onClick={() => runMeeting()}
                        disabled={loading || !questData}
                        className="mt-4 w-full py-4 bg-[#8A2F2F] text-white font-bold text-lg rounded shadow-md hover:bg-[#A63A3A] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <span className="animate-spin text-2xl">⚔️</span> 議論中...
                            </>
                        ) : (
                            logs.length === 0 ? "🔨 評議会を開始する" : "🔄 議論を再開する"
                        )}
                    </button>
                    <button
                        onClick={() => discussReport()}
                        disabled={loading || !questData}
                        className="mt-2 w-full py-3 bg-[#5C3B23] text-white font-bold text-lg rounded shadow-md hover:bg-[#7A4E33] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        <span>📑</span> 報告書を議論＆想定QA生成
                    </button>
                </div>

                {/* Right Pane: The Council Room (Chat) */}
                <div className="w-2/3 bg-[url('/images/council_room_bg.png')] bg-cover bg-center rounded-xl border-4 border-[#222] shadow-2xl relative overflow-hidden flex flex-col">
                    <div className="absolute inset-0 bg-black/60" />

                    {/* Chat Area */}
                    <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-6">
                        {logs.length === 0 && !loading && (
                            <div className="h-full flex items-center justify-center text-white/50 italic text-lg">
                                「評議会を開始する」ボタンを押して、議論を始めてください...
                            </div>
                        )}

                        {logs.map((log, idx) => (
                            <ChatMessage
                                key={idx}
                                log={log}
                                isAdopted={adoptedActions.some(a => a.message === log.message)}
                                onAdopt={() => toggleAdopt(log)}
                                onAskMore={() => askMore(log)}
                            />
                        ))}
                        <div ref={bottomRef} className="h-4" />
                    </div>

                    {/* Summon Bar */}
                    <div className="bg-black/90 p-2 border-t border-white/10 flex gap-2 overflow-x-auto justify-center">
                        {SUMMON_TARGETS.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setSummonId(prev => prev === t.id ? null : t.id)}
                                title={`${MEMBER_NAMES[t.id]}を指名`}
                                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all border-2 ${summonId === t.id
                                    ? "bg-white/20 border-yellow-400 scale-105 shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                                    : "border-transparent opacity-50 hover:opacity-100 hover:bg-white/10"
                                    }`}
                            >
                                <div className="w-8 h-8 rounded-full overflow-hidden relative border border-white/30">
                                    <Image src={MEMBER_IMAGES[t.id]} alt={t.id} fill className="object-cover" />
                                </div>
                                <span className="text-[9px] text-white font-bold">{t.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Chat Input Area */}
                    <div className="relative z-20 bg-black/80 p-4 border-t border-white/20">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="評議会に質問を投げかける...（例：コスト削減案は？）"
                                className="flex-1 bg-white/10 border border-white/30 rounded px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-blue-400"
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                disabled={loading || !userInput.trim()}
                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 disabled:opacity-50 transition-colors"
                            >
                                送信
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </ProjectQuestLayout>
    );
}

// --- Components ---

function StatusCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="p-3 bg-white rounded border border-gray-300 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className="w-full h-2 bg-gray-200 rounded-full mb-1">
                <div className={`h-2 rounded-full ${color}`} style={{ width: `${value}%` }} />
            </div>
            <div className="text-right font-bold text-sm">{value}%</div>
        </div>
    );
}

function ChatMessage({
    log,
    isAdopted,
    onAdopt,
    onAskMore
}: {
    log: CouncilLog,
    isAdopted: boolean,
    onAdopt: () => void,
    onAskMore: () => void
}) {
    const isUser = log.speakerId === "user";
    const imgSrc = isUser ? "/images/user_hero.png" : (MEMBER_IMAGES[log.speakerId] ?? "/images/master_smile.png");
    const name = isUser ? "勇者" : (MEMBER_NAMES[log.speakerId] ?? "Unknown");

    const nameColor =
        log.speakerId === "pmo" ? "text-blue-300" :
            log.speakerId === "sales" ? "text-yellow-300" :
                log.speakerId === "manager" ? "text-green-300" :
                    log.speakerId === "cto" ? "text-cyan-400" :
                        log.speakerId === "ux" ? "text-pink-400" :
                            log.speakerId === "user" ? "text-purple-300" :
                                "text-red-400"; // super_pm

    return (
        <div className={`flex gap-4 items-start animate-fade-in-up group ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className="flex-shrink-0 w-16 flex flex-col items-center gap-1">
                <div className={`w-14 h-14 rounded-full bg-gray-800 border-2 ${isUser ? 'border-purple-400' : 'border-gray-500'} overflow-hidden relative`}>
                    <Image
                        src={imgSrc}
                        alt={log.speakerId}
                        fill
                        sizes="56px"
                        className="object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-700 -z-10 text-2xl">
                        {log.speakerId === 'pmo' ? '👓' :
                            log.speakerId === 'sales' ? '✨' :
                                log.speakerId === 'manager' ? '😰' :
                                    log.speakerId === 'cto' ? '💻' :
                                        log.speakerId === 'ux' ? '🎨' :
                                            log.speakerId === 'user' ? '👑' : '🧙‍♂️'}
                    </div>
                </div>
            </div>

            <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
                <div className={`text-xs font-bold mb-1 flex items-center gap-2 ${nameColor} ${isUser ? 'justify-end' : ''}`}>
                    {name}
                    {isAdopted && (
                        <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                            Adopted
                        </span>
                    )}
                </div>
                <div className={`bg-black/70 text-white border ${isAdopted ? 'border-green-500' : isUser ? 'border-purple-500/50' : 'border-white/20'} p-4 rounded-xl shadow-lg backdrop-blur-sm relative ${isUser ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                    <p className={`whitespace-pre-wrap leading-relaxed text-sm ${isUser ? 'text-right' : 'text-left'}`}>{log.message}</p>

                    {/* Action Buttons (Visible on hover or if speaker is not user) */}
                    {!isUser && (
                        <div className="mt-3 flex gap-2 transition-opacity">
                            <button
                                onClick={onAdopt}
                                className={`text-[10px] px-3 py-1 rounded border transition-colors ${isAdopted
                                    ? 'bg-green-600 border-green-600 text-white'
                                    : 'border-white/40 hover:bg-white/20 text-white/80'
                                    }`}
                            >
                                {isAdopted ? '✅ 採用済' : '👍 案を採用'}
                            </button>
                            <button
                                onClick={onAskMore}
                                className="text-[10px] px-3 py-1 rounded border border-white/40 hover:bg-white/20 text-white/80 transition-colors"
                            >
                                🤔 詳しく聞く
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
