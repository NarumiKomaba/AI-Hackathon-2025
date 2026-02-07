"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ProjectQuestLayout from "@/components/layout/ProjectQuestLayout";
import { getFirebaseFirestore } from "@/lib/firebaseClient";
import {
  doc,
  getDoc,
  getDocs,
  query,
  collection,
  addDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";

type BoardQuestStatus = "参加中" | "募集中";

type PartySlot = {
  id: string;
  role: string;
  name: string;
  isYou?: boolean;
  filled: boolean;
};

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

// Firestoreから取得する際の型（結合前）
interface FirestoreQuestDoc {
    id: string; 
    name: string;
    // recommendedLevel: number; // BoardQuestに必要なフィールドを追加
    // durationDays: number;     // BoardQuestに必要なフィールドを追加
    status: BoardQuestStatus; // BoardQuestに必要なフィールドを追加
    purpose: string;        // BoardQuestに必要なフィールドを追加
    success_conditions: string[];     // BoardQuestに必要なフィールドを追加
    deliverables: string[];   // BoardQuestに必要なフィールドを追加
    overview: string;          // BoardQuestに必要なフィールドを追加
    rewards: string[];        // BoardQuestに必要なフィールドを追加
    experience_gains: string[];       // BoardQuestに必要なフィールドを追加
    start_date: Timestamp;
    // ★ 修正点: テンプレートフィールドを明示的に定義
    partySlotsTemplate?: PartySlot[]; 
}

interface FirestorePartyMemberDoc {
    member_id: string; // メンバーIDまたはスロットID
    projectId: string;
    role: string;
    member_name: string;
    // isYou: boolean;
}

// 既存のパーティスロットのテンプレート（FirestoreQuestDoc に含まれていると仮定）をベースにする
const partySlotsTemplate: PartySlot[] =  [
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
    ];


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
      "要件定義書・基本設計書一式（古文書スタイルの魔導書）",
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
      { id: "slot-1", role: "勇者", name: "募集中", filled: false },
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
  const partyScrollRef = useRef<HTMLDivElement | null>(null);
  const [showPartyArrow, setShowPartyArrow] = useState(false);

  const handleJoin = () => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== selected.id) return q;
        if (q.status === "参加中") return q;

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

  useEffect(() => {
    const el = partyScrollRef.current;
    if (!el) return;

    

    const fetchQuests = async () => {
      const db = getFirebaseFirestore();

      // 1. testProjects (クエスト) の取得
      // ドキュメントIDを取得するため、map内で doc.id も取得します。
      const firestoreQuests: FirestoreQuestDoc[] = await getDocs(
        collection(db, "testProjects")
      ).then((snapshot) =>
        snapshot.docs.map((doc) => {
          // Doc IDをデータに含める
           return {
            id: doc.id, 
            ...(doc.data() as Omit<FirestoreQuestDoc, 'id'>)
          };
        })
      );

      const col_party = collection(db, "party_members");
      // const combinedQuests = MOCK_QUESTS;
      // ★ 修正点1: MOCK_QUESTSをベースに新しい配列を作成し、重複を防ぐ
      const combinedQuests: BoardQuest[] = [...MOCK_QUESTS];

      // 2. 各クエストに対してパーティメンバーを取得し、データを結合する
      for (const questDoc of firestoreQuests) {
        // すでに combinedQuests に同じ ID が存在する場合はスキップ（重複ガード）
        if (combinedQuests.some(q => q.id === questDoc.id)) continue;
        // a. 該当クエストのパーティメンバーを取得
        const q_party = query(col_party, where("projectId", "==", questDoc.id));
        
        // party_members の取得と変換
        const partyMemberDocs: FirestorePartyMemberDoc[] = await getDocs(q_party).then(
            (snapshot) =>
                snapshot.docs.map((doc) => {
                    // ドキュメントIDをメンバーIDとして使用
                    return {
                        id: doc.id,
                        ...(doc.data() as Omit<FirestorePartyMemberDoc, 'id'>),
                    };
                }) as FirestorePartyMemberDoc[]
        );

        // b. PartySlot の構築ロジック（ここが重要）
        const finalPartySlots: PartySlot[] = [];

        
        // テンプレートスロットをコピーし、取得したメンバーデータで上書きする
        partySlotsTemplate.forEach(templateSlot => {
            const member = partyMemberDocs.find(
                (m) => m.role === templateSlot.role
            ); // 例: roleで紐付ける

            if (member) {
                // メンバーが見つかった場合、そのメンバー情報でスロットを埋める
                finalPartySlots.push({
                    ...templateSlot,
                    id: member.member_id, // DBからのユニークIDを使用
                    name: member.member_name,
                    filled: true,
                    isYou: member.role === "勇者", // 勇者ロールのみ「あなた」
                });
            } else {
                // メンバーが見つからなかった場合、テンプレートの空きスロットをそのまま使用
                finalPartySlots.push({
                    ...templateSlot,
                    filled: false,
                    name: "募集中"
                });
            }
        });

        // // 以下格納用データ（仮）
        // const start = questDoc.start_date;
        // const now = new Timestamp();

        // start.setHours(0, 0, 0, 0);
        // now.setHours(0, 0, 0, 0);
        // // const durationDays = Math.floor((now.getTime()-questDoc.start_date))
        // const durationDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        // const recommendedLevel = Math.round(Math.random()*100);

        // Firestore Timestamp → Date
const startDate: Date = questDoc.start_date.toDate();

// 現在日時
const nowDate: Date = new Date();

// 日付を 00:00:00 に正規化
startDate.setHours(0, 0, 0, 0);
nowDate.setHours(0, 0, 0, 0);

// 経過日数（開始日を1日目としてカウント）
const durationDays = Math.max(
  1,
  Math.floor(
    (nowDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1
);

// 経過日数からレコメンドレベルを算出（日数が長いほど高い）
const recommendedLevel = Math.min(99, Math.max(1, Math.round(durationDays / 3)));

        // c. 結合された BoardQuest オブジェクトの作成
        const finalQuest: BoardQuest = {
            id: questDoc.id,
            title: questDoc.name,
            recommendedLevel: Number(recommendedLevel),
            durationDays: Number(durationDays),
            status: questDoc.status,
            objective: questDoc.purpose,
            conditions: questDoc.success_conditions,
            deliverables: questDoc.deliverables,
            summary: questDoc.overview,
            rewards: questDoc.rewards,
            expGains: questDoc.experience_gains,
            // BoardQuestの型に合致させるために PartySlot[] を追加
            partySlots: finalPartySlots,
        };

        combinedQuests.push(finalQuest);

      }

      // 3. setQuests の実行
    setQuests(combinedQuests);
    return combinedQuests;
};
    fetchQuests();
    const check = () => {
      setShowPartyArrow(el.scrollWidth > el.clientWidth + 1);
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <ProjectQuestLayout>
      <div className="h-full flex gap-6 px-10">
      {/* 左：募集クエスト一覧（青い枠） */}
      <aside className="relative w-80 flex-shrink-0 overflow-visible">
        {/* 青いメニュー背景：上下だけちょっとはみ出させる */}
        <div className="pointer-events-none absolute top-[-12px] bottom-[-12px] left-[2px] right-[2px]">
          <Image
            src="/images/blue-back.png"
            alt="メニュー背景"
            fill
            className="object-fill"
          />
        </div>

        {/* 中身（クエストカード＋追加ボタン） */}
        <div className="relative z-10 flex flex-col h-full px-6 py-8">
          <h2 className="text-lg font-semibold mb-4 text-white">募集クエスト</h2>

          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            {quests.map((quest) => {
              const isActive = quest.id === selectedId;

              const titleClass =
                "text-sm font-semibold " + (isActive ? "text-white" : "text-gray-900");

              const subClass =
                "text-[11px] mt-1 " + (isActive ? "text-white/90" : "text-gray-700");

              return (
                <button
                  key={quest.id}
                  type="button"
                  onClick={() => setSelectedId(quest.id)}
                  className="relative w-full h-28 text-left"
                >
                  {/* 背景：選択/非選択で切り替え */}
                  <Image
                    src={isActive ? "/images/Group 54.png" : "/images/Group 40.png"}
                    alt={quest.title}
                    fill
                    className="object-fill"
                  />

                  <div className="absolute inset-0 px-5 py-5 flex flex-col justify-between">
                    <div>
                      <div className={titleClass}>{quest.title}</div>
                      <div className={subClass}>
                        推奨Lv{quest.recommendedLevel} / 経過{quest.durationDays}日
                      </div>
                    </div>

                    {/* ステータス（画像のまま使うならここ） */}
                    <div className="relative w-24 h-7 mt-1">
                      <Image
                        src={
                          quest.status === "参加中"
                            ? "/images/Frame 8.png"
                            : "/images/Frame 19.png"
                        }
                        alt={quest.status}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                </button>
              );
            })}

          </div>

          {/* 追加ボタン */}
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => router.push("/quest/new")}
              className="relative w-10 h-10"
            >
              <Image
                src="/images/Group 18.png"
                alt="クエスト追加"
                fill
                className="object-contain"
              />
            </button>
          </div>
        </div>
      </aside>

        {/* 右：クエスト詳細 */}
        <section className="flex-1 flex flex-col">
          {/* 見出しボード */}
          <div className="relative h-20 mb-4">
            <Image
              src="/images/見出し@144x.png"
              alt="見出し"
              fill
              className="object-contain"
            />
            <div className="absolute inset-0 flex flex-col justify-center px-12">
              <div className="text-base font-bold text-white">
                {selected.title}
              </div>
              <div className="text-xs text-white mt-1">
                推奨Lv{selected.recommendedLevel} / 経過
                {selected.durationDays}日
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 text-xs leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 左カラム：目的・達成条件・納品対象 */}
              <div>
                <DetailSection title="目的">
                  <p>{selected.objective}</p>
                </DetailSection>

                <DetailSection title="達成条件">
                  <ul className="list-disc list-inside space-y-1">
                    {selected.conditions.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </DetailSection>

                <DetailSection title="納品対象">
                  <ul className="list-disc list-inside space-y-1">
                    {selected.deliverables.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </DetailSection>
              </div>

              {/* 右カラム：概要・報酬・獲得経験値 */}
              <div>
                <DetailSection title="概要">
                  <p>{selected.summary}</p>
                </DetailSection>

                <DetailSection title="報酬">
                  <ul className="list-disc list-inside space-y-1">
                    {selected.rewards.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </DetailSection>

                <DetailSection title="獲得経験値">
                  <ul className="list-disc list-inside space-y-1">
                    {selected.expGains.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </DetailSection>
              </div>
            </div>

            {/* パーティ構成はその下に続く */}
            <h3 className="mt-6 text-sm font-semibold">パーティ構成</h3>
            <div className="mt-2 flex items-center gap-3">
              {/* 横スクロールコンテナ */}
              <div className="flex-1 overflow-x-auto" ref={partyScrollRef}>
                <div className="flex gap-3 min-w-max">
                  {selected.partySlots.map((slot) => (
                    <PartyCard key={slot.id} slot={slot} />
                  ))}
                </div>
              </div>

              {/* 右端の矢印（Group 37.png）: スクロール必要なときだけ表示 */}
              {showPartyArrow && (
                <button
                  type="button"
                  onClick={() =>
                    partyScrollRef.current?.scrollBy({ left: 160, behavior: "smooth" })
                  }
                  className="flex-shrink-0 relative w-10 h-10"
                >
                  <Image
                    src="/images/Group 37.png"
                    alt="scroll right"
                    fill
                    className="object-contain"
                  />
                </button>
              )}
            </div>
          </div>


          {/* 下部：参加ボタン */}
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleJoin}
              disabled={selected.status === "参加中"}
              className={`w-64 py-3 rounded-full text-sm font-semibold transition ${
                selected.status === "参加中"
                  ? "bg-gray-400 text-white cursor-default"
                  : "bg-teal-700 text-white hover:bg-teal-800"
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

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4">
      {/* 茶色 & 太めの下線 */}
      <h3 className="text-sm font-semibold text-[#8A4B26] border-b-2 border-[#8A4B26] pb-1 mb-2">
        {title}
      </h3>
      <div className="text-xs text-gray-800 leading-relaxed">{children}</div>
    </section>
  );
}

function PartyCard({ slot }: { slot: PartySlot }) {
  const labelSrc = slot.filled
    ? "/images/Frame 20.png" // 参加中
    : "/images/Frame 21.png"; // 募集中

  const bottomClass = slot.filled
    ? "bg-[#A54632] text-white"   // 参加中：赤
    : "bg-[#B0B0B0] text-white";  // 募集中：グレー

  // 役職ごとのキャラ画像
  const roleImageMap: Record<string, string> = {
    勇者: "/images/knight.jpg",
    戦士: "/images/warrior.jpg",
    魔法使い: "/images/wizard.jpg",
    アーチャー: "/images/archer.jpg",
  };
  const roleImageSrc = roleImageMap[slot.role] ?? "/images/warrior.jpg";

  return (
    <div className="relative w-32 h-44 bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">

      {/* 左上バッジ（参加中 / 募集中） */}
      <div className="absolute top-0 left-0 w-20 h-7 z-10">
        <Image src={labelSrc} alt="status" fill className="object-contain" />
      </div>

      {/* 中身：バッジと被らないように上に余白をとる */}
      <div className="h-full flex flex-col pt-4">
        {/* 上：キャラ画像エリア */}
        <div className="relative h-24 bg-[#F3F0E6] flex-shrink-0">
          <Image
            src={roleImageSrc}
            alt={slot.role}
            fill
            className="object-contain"
          />
        </div>

        {/* 下：色付き帯（役職＋名前） → カード下端まで塗りつぶし */}
        <div
          className={`${bottomClass} flex-1 px-2 py-1 text-center text-[11px] leading-tight`}
        >
          <div className="font-semibold text-sm">
            {slot.filled ? slot.role : "募集中"}
          </div>
          <div className="mt-1">
            {slot.filled ? slot.name : "募集中（誰でも）"}
          </div>
        </div>
      </div>
    </div>
  );
}
