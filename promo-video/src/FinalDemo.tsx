
import { AbsoluteFill, Video, Audio, staticFile, Sequence } from 'remotion';

export const FinalDemo: React.FC = () => {
    // ユーザー指定のタイムコード（fps=30想定）
    const timings = {
        introduction: 0,
        board_intro: 11 * 30,      // 330
        quest_new: 30 * 30 + 13,   // 913 (30.13s)
        quests_detail: 42 * 30 + 14, // 1274 (42.14s)
        status_screen: 63 * 30 + 16,  // 1906 (1:03.16)
        report_generation: 79 * 30 + 14, // 2384 (1:19.14) - 報告書作成
        mode_switch: 130 * 30,     // 3900 (2:10.00) - 前倒ししてテンポアップ
        council_meeting: 150 * 30, // 4500 (2:30.00) - AI評議会
        council_report: 235 * 30,  // 7050 (3:55) - 議論要約
        ending: 281 * 30,          // 8430 (4:41) - エンディング (音声8が約45sあるため少し後ろに)
    };

    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {/* メイン動画: 音声8終了のタイミングでカット */}
            <Sequence from={0} durationInFrames={timings.ending}>
                <Video src={staticFile("demo-video.mp4")} />
            </Sequence>

            {/* エンディング: 最初のフレームの静止画を10秒表示 */}
            <Sequence from={timings.ending} durationInFrames={300}>
                <img
                    src={staticFile("ending-frame.png")}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    alt="Ending"
                />
            </Sequence>

            {/* ナレーション音声 */}
            <Sequence from={timings.introduction}>
                <Audio src={staticFile("audio/narration_0.mp3")} />
            </Sequence>
            <Sequence from={timings.board_intro}>
                <Audio src={staticFile("audio/narration_1.mp3")} />
            </Sequence>
            <Sequence from={timings.quest_new}>
                <Audio src={staticFile("audio/narration_2.mp3")} />
            </Sequence>
            <Sequence from={timings.quests_detail}>
                <Audio src={staticFile("audio/narration_3.mp3")} />
            </Sequence>
            <Sequence from={timings.status_screen}>
                <Audio src={staticFile("audio/narration_4.mp3")} />
            </Sequence>
            <Sequence from={timings.report_generation}>
                <Audio src={staticFile("audio/narration_5.mp3")} />
            </Sequence>
            <Sequence from={timings.mode_switch}>
                <Audio src={staticFile("audio/narration_6.mp3")} />
            </Sequence>
            <Sequence from={timings.council_meeting}>
                <Audio src={staticFile("audio/narration_7.mp3")} />
            </Sequence>
            <Sequence from={timings.council_report}>
                <Audio src={staticFile("audio/narration_8.mp3")} />
            </Sequence>
            <Sequence from={timings.ending}>
                <Audio src={staticFile("audio/narration_9.mp3")} />
            </Sequence>

            {/* BGMもうっすら流しちゃう？ */}
            <Audio src={staticFile("audio/bgm.wav")} volume={0.1} loop />
        </AbsoluteFill>
    );
};
