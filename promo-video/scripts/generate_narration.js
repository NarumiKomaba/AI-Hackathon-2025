
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
const util = require('util');

// 設定
const CREDENTIALS_PATH = "c:/hackathon/service-account.json";
const OUTPUT_DIR = "c:/hackathon/promo-video/public/audio";
process.env.GOOGLE_APPLICATION_CREDENTIALS = CREDENTIALS_PATH;

const NARRATIONS = [
    { name: "0_introduction", text: "プロジェクトという名のクエストを攻略せよ。Geminiを搭載した次世代プロジェクト管理ツール、プロジェクト・クエストの全貌を紹介します。" },
    { name: "1_board_intro", text: "まずはメインボード。左側のクエストリストをスクロールして、今自分がどの冒険に参加しているか一瞬で把握。アールピージー風のユウアイが、膨大な案件管理を直感的な『ギルドの依頼板』へと変えてくれます。" },
    { name: "2_quest_new", text: "新しいクエストの登録も簡単。プロジェクトの目的や概要を入力すれば、そこから新しい冒険の物語が始まります。" },
    { name: "3_quests_detail", text: "クエスト詳細画面では、ガントチャートによるスケジュール管理はもちろん、特筆すべきはこのギルドマスターのコメント！ 状況を自動分析して、今、指揮官が意識すべきポイントを的確にアドバイス。孤独なピーエムの隣に、常に賢者が寄り添います。" },
    { name: "4_status_screen", text: "あなたの頑張りはすべて数値化。独自のステータス画面で、スキルレベルや現在の称号を確認。仕事を通じた成長を、アールピージーのキャラクターのように実感できるんです。" },
    { name: "5_report_generation", text: "そしてプロジェクト管理の真骨頂、報告書生成機能です。TeamsやSlackなどのチャットログに加え、ダブリュービーエス、レッドマイン、そしてプロジェクト管理とは切り離せない、おかねの情報。それらを読ませることで、現場の生々しい実態を多角的に分析します。単なる資料作成ではありません。Geminiの本質を見抜いた『ガチの報告』を爆速で生成。表示されたプレビューはエディタで自由に書き換え可能で、人間が最後の魂を吹き込みます。この共創のプロセスが、報告という孤独な作業を、戦略的な意思決定へと変貌させます。" },
    { name: "6_mode_switch", text: "プロジェクトの空気に合わせてデザインを切り替え。情緒あるRPGモードと、端正なビジネスモード。どちらもデータの透明性は変わりません。もちろん、画面の内容でピーディーエフをダウンロードできます。" },
    { name: "7_council_meeting", text: "ここがProject Questの心臓部、エーアイ評議会です。ご覧ください、この流れるようなストリーミング。異なる専門性を持つ8人のエーアイエージェントたちが、リアルタイムで議論を繰り広げています。彼らはただ同調し合うのではありません。あるエーアイは納期を心配し、別のエーアイは技術的負債に警鐘を鳴らす。あえて設計された『対立構造』によって、議論の解像度は飛躍的に高まり、人間の盲点を突く鋭い意見が次々と飛び出します。あなたがすべきことは、この熱い議論を俯瞰し、納得できる案を見極めること。そして、特定の案を『採用』すれば、評議会はさらに次のフェーズへ。選ばれたコンセプトをどう具体化し、どうリスクを回避するか。議論はさらに深掘りされ、明日から現場が動ける『収束』のプロセスへと向わます。このスピード、この深さ。もはやPMは一人で悩む必要はありません。エーアイたちの知性を借り、あなたは最高のアウトプットを出すための『意思決定』に、そのすべてのエネルギーを注ぎ込んでください。チームの総意をエーアイが作り上げ、あなたが最後の一おしをする。これが、次世代のプロジェクト攻略スタイルです。" },
    { name: "8_council_report", text: "評議会の白熱した議論は、そのまま一気通貫で詳細なレポートへと昇華されます。しかし、Project Questの凄さはそれだけではありません。報告時にステークホルダーから突っ込まれそうなリスク要因を先回りし、理論武装のための『想定きゅうエー』まで自動生成してくれるんです。対立意見も踏まえた多角的な回答案が手元にある。これこそが、会議の準備をエーアイと一緒に終わらせる、次世代のワークスタイルです。あなたはもう、翌朝の会議を恐れる必要はありません。万全の準備を整え、自信を持って意思決定をリードする。そんなPMの新しい日常が、ここから始まります。" },
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

    console.log("All narrations generated successfully! ✨");
}

generateNarration().catch(console.error);
