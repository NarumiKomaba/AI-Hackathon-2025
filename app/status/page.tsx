"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import ProjectQuestLayout from "@/components/layout/ProjectQuestLayout";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";

type CharacterStatus = {
    name: string;
    title: string;
    level: number;
    exp: number;
    expMax: number;
    mainRole: string;
    currentQuest: string;
    equipment: {
        weapon: string;
        armor: string;
        accessory: string;
        cloak: string;
    };
    baseStats: {
        hp: number;
        agi: number;
        atk: number;
        def: number;
        weak: number;
    };
    skills: { key: string; label: string; exp: number; max: number; rank: string }[];
};

const DEFAULT_PROJECT_ID = "core-system";

export default function StatusPage() {
    const [status, setStatus] = useState<CharacterStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function fetchStatus() {
            try {
                const res = await fetch("/api/character-status", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: DEFAULT_PROJECT_ID }),
                });

                if (!res.ok) throw new Error("ステータス取得に失敗しました");

                const data = await res.json();
                if (!cancelled) {
                    setStatus(data.status);
                }
            } catch (e) {
                console.error("Status fetch error:", e);
                if (!cancelled) {
                    setError("ステータスの生成に失敗しました…");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchStatus();
        return () => { cancelled = true; };
    }, []);

    return (
        <ProjectQuestLayout>
            <LoadingOverlay show={loading} />

            {error && !loading && (
                <div className="h-full flex items-center justify-center">
                    <div className="text-center text-[#3b2a1a]">
                        <p className="text-lg font-semibold mb-2">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-sm underline opacity-80 hover:opacity-100"
                        >
                            再読み込み
                        </button>
                    </div>
                </div>
            )}

            {status && !loading && (
                <div className="h-full flex gap-6 px-10">
                    <LeftCharacterCard status={status} />
                    <RightStatusPanel status={status} />
                </div>
            )}
        </ProjectQuestLayout>
    );
}

/* -------------------- 左：キャラカード -------------------- */

function LeftCharacterCard({
    status,
}: {
    status: {
        name: string;
        title: string;
        level: number;
        exp: number;
        expMax: number;
        mainRole: string;
        currentQuest: string;
    };
}) {
    return (
        <section className="relative w-[400px] shrink-0 overflow-hidden">
            {/* 枠（Group 60） */}
            <div className="pointer-events-none absolute inset-0">
                <Image
                    src="/images/Group 60.png"
                    alt="frame"
                    fill
                    className="object-fill"
                    priority
                />
            </div>

            <div className="relative z-10 h-full px-6 pt-6 pb-4 flex flex-col m-4">
                {/* 名前 */}
                <div className="text-white">
                    <div className="text-sm font-semibold">{status.name}</div>
                    <div className="text-[11px] opacity-90 mt-1">{status.title}</div>
                </div>

                <div className="relative mt-4">
                    <div className="relative aspect-[3/4] overflow-hidden">
                        <Image
                            src="/images/knight.jpg"
                            alt="勇者アバター"
                            fill
                            className="object-cover object-center"
                            priority
                        />

                        {/* Lv を画像右上に重ねる */}
                        <div className="absolute top-[-4] right-3 w-[74px] h-[56px] z-20">
                            <Image
                                src="/images/Rectangle 61.png"
                                alt="level bg"
                                fill
                                className="object-contain"
                                priority
                            />
                            <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-[12px]">
                                Lv.{status.level}
                            </div>
                        </div>
                    </div>
                </div>

                {/* EXP */}
                <div className="mt-3">
                    <div className="text-[11px] text-white/90 mb-2">
                        経験値 {status.exp} / {status.expMax}
                    </div>
                    <RpgProgressBar value={status.exp} max={status.expMax} />
                </div>

                {/* 役割 */}
                <div className="mt-4 text-[11px] text-white/90 space-y-1">
                    <div>メインロール： {status.mainRole}</div>
                    <div>現在のクエスト： {status.currentQuest}</div>
                </div>
            </div>
        </section>

    );
}

/* -------------------- 右：ステータスパネル（背景はCSS） -------------------- */

function RightStatusPanel({ status }: {
    status: {
        equipment: Record<string, string>;
        baseStats: Record<string, number>;
        skills: { key: string; label: string; exp: number; max: number; rank: string }[];
    };
}) {
    return (
        <section className="flex-1 flex flex-col">
            {/* 見出しボード（固定） */}
            <div className="relative h-20 mb-4 shrink-0">
                <Image
                    src="/images/見出し@144x.png"
                    alt="見出し"
                    fill
                    className="object-contain"
                    priority
                />
                <div className="absolute inset-0 flex flex-col justify-center px-12">
                    <div className="text-base font-bold text-white">ステータス</div>
                    <div className="text-xs text-white mt-1">装備・能力・スキル</div>
                </div>
            </div>

            {/* 本文（ここだけスクロール） */}
            <div className="flex-1 overflow-y-auto pr-2 text-xs leading-relaxed">
                {/* 上段：装備 / ステータス */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[12px] text-[#3F2A1A]">
                    <div>
                        <SectionHeading>装備</SectionHeading>
                        <div className="mt-3 space-y-2">
                            <LabeledRow label="武器" value={status.equipment.weapon} />
                            <LabeledRow label="防具" value={status.equipment.armor} />
                            <LabeledRow label="アクセサリ" value={status.equipment.accessory} />
                            <LabeledRow label="重ね着" value={status.equipment.cloak} />
                        </div>
                    </div>

                    <div>
                        <SectionHeading>ステータス</SectionHeading>
                        <div className="mt-3 space-y-2">
                            <LabeledRow label="最大HP" value={status.baseStats.hp} />
                            <LabeledRow label="素早さ" value={status.baseStats.agi} />
                            <LabeledRow label="攻撃力" value={status.baseStats.atk} />
                            <LabeledRow label="防御力" value={status.baseStats.def} />
                            <LabeledRow label="弱点" value={status.baseStats.weak} />
                        </div>
                    </div>
                </div>

                {/* スキル経験値 */}
                <div className="text-[#3F2A1A]">
                    <div className="flex items-baseline justify-between">
                        <SectionHeading>スキル経験値</SectionHeading>
                        <span className="text-[11px] opacity-80">
                            ※ EXP が増えるほど称号が変化します
                        </span>
                    </div>

                    <div className="mt-4 space-y-4">
                        {status.skills.map((s) => (
                            <div key={s.key}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="text-[12px] font-semibold">{s.label}</div>
                                    <div className="text-[11px]">
                                        EXP {s.exp}（{s.rank}）
                                    </div>
                                </div>
                                <RpgProgressBar value={s.exp} max={s.max} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* -------------------- 共通 -------------------- */

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-sm font-semibold text-[#8A4B26] border-b-2 border-[#8A4B26] pb-1 mb-3">
            {children}
        </h3>
    );
}

function RpgProgressBar({ value, max }: { value: number; max: number }) {
    const clamped = Math.max(0, Math.min(value, max));
    const ratio = (clamped / max) * 100;

    return (
        <div className="w-full">
            <div className="h-[10px] rounded-full bg-[#E7D1AF] border border-[#7A5A3A]/60 overflow-hidden">
                <div className="h-full bg-[#0071A9]" style={{ width: `${ratio}%` }} />
            </div>
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
            <div className="w-[72px] font-semibold text-[#3F2A1A]">{label}</div>
            <div className="flex-1 text-[#3F2A1A]">{value}</div>
        </div>
    );
}
