
import { AbsoluteFill, Video, Audio, staticFile, Sequence } from 'remotion';

export const LongDemo: React.FC = () => {
    // ユーザー指定のタイムコード（fps=30想定）
    // 3分30秒（6300フレーム）Ver.用のタイムコード
    // ご主人様指定のカットを反映した新・タイムコード（3分30秒Ver.）
    const timings = {
        introduction: 0,
        board_intro: 11 * 30,       // 330
        quest_new: 30 * 30 + 4,    // 904
        quests_detail: 40 * 30,    // 1200 (Cut1直後)
        status_screen: 59 * 30 + 15, // 1785 (Cut2直後)
        report_generation: 59 * 30 + 26, // 1796 (79.4s相当からのオフセット計算)
        mode_switch: 102 * 30 + 16, // 3076 (Sequence 4の開始と同期)
        council_meeting: 117 * 30 + 18, // 3528 (Sequence 5の開始と同期)
        council_report: 167 * 30 + 18,  // 5028 (3528 + 50s)
        ending: 200 * 30,           // 6000 (残り10秒)
    };

    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {/* --- ご主人様指定のカット編集（切り貼り） --- */}

            {/* 1. 開始 〜 0:40:00 (1200f) */}
            <Sequence from={0} durationInFrames={1200}>
                <Video src={staticFile("demo-video.mp4")} startFrom={0} endAt={1200} />
            </Sequence>

            {/* 2. 0:42.5 〜 1:02.0 (1275f 〜 1860f) */}
            <Sequence from={1200} durationInFrames={1860 - 1275}>
                <Video src={staticFile("demo-video.mp4")} startFrom={1275} endAt={1860} />
            </Sequence>

            {/* 3. 1:19.1 〜 2:02.14 (2373f 〜 3664f) */}
            <Sequence from={1785} durationInFrames={3664 - 2373}>
                <Video src={staticFile("demo-video.mp4")} startFrom={2373} endAt={3664} />
            </Sequence>

            {/* 4. 2:09.2 〜 2:24.26 (3876f 〜 4328f) */}
            <Sequence from={3076} durationInFrames={4328 - 3876}>
                <Video src={staticFile("demo-video.mp4")} startFrom={3876} endAt={4328} />
            </Sequence>

            {/* 5. 2:30.0 〜 (4500f 〜。ビデオの終わりまで) */}
            <Sequence from={3528} durationInFrames={6000 - 3528}>
                <Video src={staticFile("demo-video.mp4")} startFrom={4500} endAt={4500 + (6000 - 3528)} />
            </Sequence>

            {/* 固定エンディング画像 (6000fから300フレーム) */}
            <Sequence from={6000} durationInFrames={300}>
                <img
                    src={staticFile("ending-frame.png")}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    alt="Ending"
                />
            </Sequence>

            {/* ナレーション音声（3:30 Ver.専用パス） */}
            <Sequence from={timings.introduction}>
                <Audio src={staticFile("audio_330/narration_0.mp3")} />
            </Sequence>
            <Sequence from={timings.board_intro}>
                <Audio src={staticFile("audio_330/narration_1.mp3")} />
            </Sequence>
            <Sequence from={timings.quest_new}>
                <Audio src={staticFile("audio_330/narration_2.mp3")} />
            </Sequence>
            <Sequence from={timings.quests_detail}>
                <Audio src={staticFile("audio_330/narration_3.mp3")} />
            </Sequence>
            <Sequence from={timings.report_generation}>
                <Audio src={staticFile("audio_330/narration_5.mp3")} />
            </Sequence>
            <Sequence from={timings.mode_switch}>
                <Audio src={staticFile("audio_330/narration_6.mp3")} />
            </Sequence>
            <Sequence from={timings.council_meeting}>
                <Audio src={staticFile("audio_330/narration_7.mp3")} />
            </Sequence>
            <Sequence from={timings.council_report}>
                <Audio src={staticFile("audio_330/narration_8.mp3")} />
            </Sequence>
            <Sequence from={timings.ending}>
                <Audio src={staticFile("audio_330/narration_9.mp3")} />
            </Sequence>

            <Audio src={staticFile("audio/bgm.wav")} volume={0.1} loop />
        </AbsoluteFill>
    );
};
