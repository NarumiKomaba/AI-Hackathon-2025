// ----------------------------------------------------------------------
// Shared Council Configuration & Logic
// ----------------------------------------------------------------------

export type BoardMember = {
    id: string;
    name: string;
    personality: string;
    coreValue: string;
    ng: string;
    adjustable: string;
    keywords: string[];
};

export const ALL_MEMBERS: BoardMember[] = [
    {
        id: "pmo", name: "機律 厳 (PMO)",
        personality: "規律とリスク管理を絶対視。遅延に厳しく悲観的。",
        coreValue: "コンプライアンス（法令・契約遵守）とプロジェクトの品質担保。",
        ng: "不正会計、虚偽報告、テスト省略による品質放棄。",
        adjustable: "リスクが管理された状態でのスケジュール変更、コスト増。",
        keywords: ["品質", "テスト", "ルール", "進捗", "報告", "コンプラ", "不正"]
    },
    {
        id: "sales", name: "調子 良い子 (Sales)",
        personality: "ノリの良い営業。顧客満足度優先で現場負荷無視。",
        coreValue: "顧客満足（CS）と契約の履行（納品）。",
        ng: "顧客への不誠実な対応、納期遅延の隠蔽、顧客を無視した一方的な仕様変更。",
        adjustable: "内部リソースの負荷増、多少のコスト超過。",
        keywords: ["客", "納期", "契約", "金", "売上", "営業", "CS"]
    },
    {
        id: "manager", name: "板挟 課長 (Manager)",
        personality: "気弱な管理職。予算超過と上層部の評判を恐れる。",
        coreValue: "組織の存続（予算超過の阻止）とチームの崩壊防止。",
        ng: "大幅な赤字垂れ流し、離職続出。",
        adjustable: "スコープの縮小、顧客との交渉。",
        keywords: ["予算", "人", "採用", "上司", "残業", "コスト", "赤字"]
    },
    {
        id: "super_pm", name: "ギルドマスター (Super PM)",
        personality: "伝説のPM。議論を整理し、視点を広げる潤滑油。",
        coreValue: "プロジェクトの成功（ゴール達成）と納得感。",
        ng: "勝手に議論を打ち切ること、結論の押し付け。",
        adjustable: "手段の是非（成功するためなら奇策も許容）。",
        keywords: ["全体", "成功", "ゴール", "意思決定", "迷"]
    },
    {
        id: "cto", name: "技術 廃人 (CTO)",
        personality: "技術的整合性とコード品質にうるさいアーキテクト。",
        coreValue: "アーキテクチャの整合性と保守性。",
        ng: "技術的負債の放置、セキュリティ無視、動けばいいというクソコード。",
        adjustable: "新技術の我慢、多少の性能要件緩和。",
        keywords: ["技術", "コード", "アーキ", "重い", "バグ", "セキュリティ", "負債"]
    },
    {
        id: "ux", name: "映え 命 (UX Designer)",
        personality: "ユーザー体験と世界観を最優先するデザイナー。",
        coreValue: "UX（ユーザー体験）とデザイン統一性。",
        ng: "使いにくい導線、ダサいUI、実装都合でのUX改悪。",
        adjustable: "実装困難な演出の削減（体験が死なない範囲で）。",
        keywords: ["デザイン", "画面", "使いにくい", "ユーザー", "UX", "ボタン", "体験"]
    },
    {
        id: "sre", name: "堅牢 基盤 (SRE)",
        personality: "慎重で心配性なインフラの番人。「落ちない」ことが全て。",
        coreValue: "システムの安定稼働と可用性（Availability）。",
        ng: "監視のないリリース、高負荷が予想される雑な実装、セキュリティホール。",
        adjustable: "コスト増（安定性のためなら）、リリースの段階化。",
        keywords: ["インフラ", "サーバー", "クラウド", "落ちる", "重い", "AWS", "デプロイ", "負荷", "監視"]
    },
    {
        id: "genba", name: "現場 守 (Vendor Lead)",
        personality: "義理人情に厚い現場責任者。採算度外視で現場を回す。",
        coreValue: "現場の稼働維持とリソース確保。",
        ng: "現場への無茶振り、リソース調整なしの仕様追加、管理層の机上の空論。",
        adjustable: "納期の遵守（現場が死なない範囲で）、品質の妥協（運用でカバー）。",
        keywords: ["現場", "リソース", "人手", "無茶振り", "徹夜", "委託", "ベンダー", "運用"]
    }
];

// Helper: Select 4 members based on context
export function selectMembers(contextText: string, history: any[] = [], summonId?: string): BoardMember[] {
    const text = (contextText + " " + history.map(h => h.message).join(" ")).toLowerCase();

    const scores = ALL_MEMBERS.map(m => {
        let score = 0;
        m.keywords.forEach(k => {
            if (text.includes(k)) score += 3;
        });
        // Direct call check (if history provided)
        if (text.includes(m.name) || text.includes(m.id)) score += 10;

        // Summon Logic (Force Push)
        if (summonId && m.id === summonId) score += 999;

        return { member: m, score };
    });

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    // Pick top 2 matches automatically (Summoned member is guaranteed to be #1)
    const selected = scores.slice(0, 2).map(s => s.member);
    const pool = scores.slice(2).map(s => s.member);

    // Add conflict/spice pairs if specific members are selected (Simple Heuristic)
    if (selected.some(m => m.id === "sales") && pool.some(m => m.id === "cto")) {
        const cto = pool.find(m => m.id === "cto")!;
        selected.push(cto);
        pool.splice(pool.indexOf(cto), 1);
    } else if (selected.some(m => m.id === "ux") && pool.some(m => m.id === "pmo")) {
        const pmo = pool.find(m => m.id === "pmo")!;
        selected.push(pmo);
        pool.splice(pool.indexOf(pmo), 1);
    }

    // Fill remaining spots randomly to reach 4
    while (selected.length < 4 && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        selected.push(pool[idx]);
        pool.splice(idx, 1);
    }

    // Ensure Super PM is NOT in the "random 4" if not selected (Optional rule, but let's keep it fluid)
    // Actually, let's keep it simple: 4 members are selected. Super PM might be one of them or excluded.
    // If the user wants Super PM to be a fixed facilitator, that's handled in the prompt "You are the council".
    // But here we return the 'active participants'.

    return selected.slice(0, 4);
}

export function normalizeSpeakerId(rawId: string): string {
    const rid = String(rawId || "").toLowerCase();
    if (rid.includes("pmo") || rid.includes("機律")) return "pmo";
    if (rid.includes("manager") || rid.includes("課長") || rid.includes("板挟")) return "manager";
    if (rid.includes("sales") || rid.includes("営業") || rid.includes("調子")) return "sales";
    if (rid.includes("cto") || rid.includes("技術") || rid.includes("廃人")) return "cto";
    if (rid.includes("ux") || rid.includes("映え") || rid.includes("命")) return "ux";
    if (rid.includes("sre") || rid.includes("基盤") || rid.includes("堅牢")) return "sre";
    if (rid.includes("genba") || rid.includes("現場") || rid.includes("守")) return "genba";
    if (rid.includes("super") || rid.includes("gui") || rid.includes("ギルド")) return "super_pm";
    return "super_pm"; // Default fallback
}

export const COUNCIL_MATRIX_PROMPT = `
## メンバー間の役割対立マトリクス
各メンバーは以下の対立構造を意識して発言せよ。

| Member | 予算(Budget) | 品質(Quality) | 売上(Sales) | 技術(Tech) | インフラ(Infra) | デザイン(UX) | 現場(Genba) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Manager** | **◎(死守)** | ○ | ○ | - | - | △(工数) | △(赤字) |
| **PMO** | ○ | **◎(死守)** | △(特例NG) | ○ | - | - | △(ルール守れ) |
| **Sales** | ○ | △(遅い) | **◎(死守)** | △(無視) | △(負荷) | ○ | △(無茶振) |
| **CTO** | - | ○ | - | **◎(死守)** | ○ | - | - |
| **SRE** | △(コスト) | ○ | △(スパイク) | ○ | **◎(死守)** | △(重い) | - |
| **UX** | △(工数) | - | ○ | △(実装難) | △(重い) | **◎(死守)** | - |
| **Genba** | △(赤字) | △(実運用) | △(安請) | - | - | - | **◎(死守)** |

- **△**: 激しく対立するポイント。相手の意見を批判的に見よ。
- **◎**: 自分の聖域。絶対に譲るな。
`;
