"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import ProjectQuestLayout from "@/components/layout/ProjectQuestLayout";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebaseClient";

// --- Types ---
type CouncilLog = {
    speakerId: "pmo" | "manager" | "sales" | "super_pm" | "user";
    message: string;
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
    pmo: "/images/council_pmo.png",       // 要: 画像用意 (眼鏡の男性)
    manager: "/images/council_manager.png", // 要: 画像用意 (気弱なおじさん)
    sales: "/images/council_sales.png",     // 要: 画像用意 (派手な女性)
    super_pm: "/images/master_smile.png",   // 既存のマスター画像
};

const MEMBER_NAMES: Record<string, string> = {
    pmo: "機律 厳 (PMO)",
    manager: "板挟 課長",
    sales: "調子 良い子",
    super_pm: "GUILD MASTER",
};

export default function CouncilRoomPage() {
    const params = useParams();
    const questId = params.id as string;
    const bottomRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [logs, setLogs] = useState<CouncilLog[]>([]);
    const [questData, setQuestData] = useState<QuestData | null>(null);
    const [userInput, setUserInput] = useState("");
    const [adoptedMessages, setAdoptedMessages] = useState<number[]>([]);

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
                }),
            });

            if (!res.ok) throw new Error("Meeting failed");
            const data = (await res.json()) as CouncilLog[];

            for (const log of data) {
                setLogs((prev) => [...prev, log]);
                await new Promise((r) => setTimeout(r, 1200));
            }

        } catch (e) {
            console.error(e);
            setLogs((prev) => [...prev, { speakerId: "super_pm", message: "（通信障害により会議は中断された…）" }]);
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

    const toggleAdopt = (idx: number) => {
        setAdoptedMessages(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
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

                            <div className="mt-8 p-4 bg-[#E0D8C8] rounded border border-[#5C3B23]/20">
                                <p className="text-sm text-[#5C3B23] font-bold mb-2 underline">採用されたアクション案:</p>
                                {adoptedMessages.length === 0 ? (
                                    <p className="text-xs text-[#5C3B23]/60 italic">まだありません</p>
                                ) : (
                                    <ul className="text-xs text-[#5C3B23] space-y-1 list-disc pl-4">
                                        {adoptedMessages.map(idx => (
                                            <li key={idx} className="line-clamp-2">{logs[idx]?.message}</li>
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
                </div>

                {/* Right Pane: The Council Room (Chat) */}
                <div className="w-2/3 bg-[url('/images/council_room_bg.jpg')] bg-cover bg-center rounded-xl border-4 border-[#222] shadow-2xl relative overflow-hidden flex flex-col">
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
                                isAdopted={adoptedMessages.includes(idx)}
                                onAdopt={() => toggleAdopt(idx)}
                                onAskMore={() => askMore(log)}
                            />
                        ))}
                        <div ref={bottomRef} className="h-4" />
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
    const name = isUser ? "YOU (Guild Leader)" : (MEMBER_NAMES[log.speakerId] ?? "Unknown");

    const nameColor =
        log.speakerId === "pmo" ? "text-blue-300" :
            log.speakerId === "sales" ? "text-yellow-300" :
                log.speakerId === "manager" ? "text-green-300" :
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
                        className="object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-700 -z-10 text-2xl">
                        {log.speakerId === 'pmo' ? '👓' : log.speakerId === 'sales' ? '✨' : log.speakerId === 'manager' ? '😰' : log.speakerId === 'user' ? '👑' : '🧙‍♂️'}
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

                    {/* Action Buttons (Visible on hover or if speaker is not super_pm/user) */}
                    {!isUser && log.speakerId !== 'super_pm' && (
                        <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
