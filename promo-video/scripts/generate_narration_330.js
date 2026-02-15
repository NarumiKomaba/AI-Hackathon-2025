
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
const util = require('util');

// 設定
const CREDENTIALS_PATH = "c:/hackathon/service-account.json";
const OUTPUT_DIR = "c:/hackathon/promo-video/public/audio_330";
process.env.GOOGLE_APPLICATION_CREDENTIALS = CREDENTIALS_PATH;

const NARRATIONS = [
    { name: "0_introduction", text: "プロジェクトという名のクエストを攻略せよ。Gemini搭載。次世代プロジェクト管理ツール、プロジェクト・クエストの全貌を紹介します。" },
    { name: "1_board_intro", text: "メインボードでは、参加中の冒険を一瞬で把握。RPG風のUIが、膨大な案件を直感的な『ギルドの依頼板』へと変えてくれます。" },
    { name: "2_quest_new", text: "新しいクエストの登録も簡単。目的や概要を入力すれば、そこから新しい物語が始まります。" },
    { name: "3_quests_detail", text: "詳細画面では、ガントチャート管理に加え、ギルドマスターが状況を自動分析。今意識すべきポイントを的確にアドバイス。PMの隣に、常に賢者が寄り添います。" },
    { name: "4_status_screen", text: "頑張りはすべて数値化。独自のステータス画面で、スキルアップをRPG의キャラクターのように実感できるんです。" },
    { name: "5_report_generation", text: "プロジェクト管理の真骨頂、報告書生成機能です。TeamsやSlackなどのチャットログに加え、ダブリュービーエス、レッドマイン、そしてプロジェクト管理とは切り離せない、おかねの情報。それらを読ませることで、現場の生々しい実態を多角的に分析します。単なる資料作成ではありません。Geminiが本質を見抜いた『ガチの報告』を爆速で生成。表示されたプレビューはエディタで自由に書き換え可能で、人間が最後の魂を吹き込みます。この共創のプロセスが、報告という孤独な作業を、戦略的な意思決定へと変貌させます。" },
    { name: "6_mode_switch", text: "情緒あるRPGモードと、端正なビジネスモード。切り替えは一瞬。画面の内容はPDFでダウンロード可能です。" },
    { name: "7_council_meeting", text: "ここがProject Questの心臓部、エーアイ評議会。8人のエージェントがリアルタイムで議論を繰り広げます。あえて設計された『対立構造』が盲点を突き、議論の解像度を飛躍的に高めます。あなたが案を採用すれば、評議会はさらに次のフェーズへ。具体化とリスク回避を深掘りし、現場が動ける『収束』へと向かいます。もう一人で悩む必要はありません。知性を借り、意思決定にエネルギーを注いでください。" },
    { name: "8_council_report", text: "議論はレポートへと昇華されます。さらに、リスクを先回りし『想定きゅうエー』まで自動生成。多角的な回答案が手元にある。これこそが会議の準備をエーアイと終わらせる、次世代のワークスタイルです。あなたはもう、会議を恐れる必要はありません。自信を持って意思決定をリードする。そんなPMの新しい日常が、ここから始まります。" },
    { name: "9_ending", text: "集計ではなく、意思決定を。プロジェクト・クエスト。さあ、あなたもプロジェクト管理の新しい扉を開きましょう。" }
];

async function generateNarration() {
    const client = new textToSpeech.TextToSpeechClient();

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    for (let i = 0; i < NARRATIONS.length; i++) {
        const item = NARRATIONS[i];
        console.log(`Generating audio for: ${item.name}...`);

        const request = {
            input: { text: item.text },
            voice: { languageCode: 'ja-JP', name: 'ja-JP-Neural2-B' }, // 高品質 Neural2 
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 1.05,
                pitch: 0.0
            },
        };

        const [response] = await client.synthesizeSpeech(request);
        const filename = `narration_${i}.mp3`;
        const filepath = path.join(OUTPUT_DIR, filename);

        const writeFile = util.promisify(fs.writeFile);
        await writeFile(filepath, response.audioContent, 'binary');
        console.log(`Audio content written to file: ${filepath}`);
    }

    console.log("3:30 version narrations (adjusted) generated successfully! ✨");
}

generateNarration().catch(console.error);
