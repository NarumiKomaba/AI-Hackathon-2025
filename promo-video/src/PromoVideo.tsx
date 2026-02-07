import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, Img, staticFile, spring, useVideoConfig, Audio } from "remotion";
import { z } from "zod";
import { RequirementsScene } from "./RequirementsScene";
import { TeamScene } from "./TeamScene";
import { ReportScene } from "./ReportScene";

const FONT_FAMILY = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// --- Types ---
export const promoSchema = z.object({
    title: z.string(),
});

// --- Main Composition ---
export const PromoVideo: React.FC<z.infer<typeof promoSchema>> = ({ title }) => {
    // Total Duration: 34s (1020 frames)
    // 1. Intro: 0-150 (5s)
    // 2. Requirements: 150-360 (7s) [+2s]
    // 3. Team: 360-570 (7s) [+2s]
    // 4. Dashboard: 570-720 (5s)
    // 5. Council: 720-870 (5s)
    // 6. Report: 870-960 (3s)
    // 7. Outro: 960-1020 (2s)

    return (
        <AbsoluteFill style={{ backgroundColor: "#1a1a1a" }}>
            <Sequence durationInFrames={150}>
                <IntroScene title={title} />
            </Sequence>
            <Sequence from={150} durationInFrames={210}>
                <RequirementsScene />
            </Sequence>
            <Sequence from={360} durationInFrames={210}>
                <TeamScene />
            </Sequence>
            <Sequence from={570} durationInFrames={150}>
                <DashboardScene />
            </Sequence>
            <Sequence from={720} durationInFrames={150}>
                <CouncilScene />
            </Sequence>
            <Sequence from={870} durationInFrames={90}>
                <ReportScene />
            </Sequence>
            <Sequence from={960} durationInFrames={60}>
                <OutroScene />
            </Sequence>
            <Audio
                src={staticFile("audio/bgm.wav")}
                volume={(f) =>
                    interpolate(f, [900, 1020], [1, 0], { extrapolateLeft: "clamp" })
                }
            />
        </AbsoluteFill>
    );
};

// --- Scenes ---

const IntroScene: React.FC<{ title: string }> = ({ title }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const logoScale = spring({ frame, fps, from: 0.5, to: 1, config: { damping: 10 } });
    const textOpacity = interpolate(frame, [20, 50], [0, 1]);
    const subTextOpacity = interpolate(frame, [50, 80], [0, 1]);

    return (
        <AbsoluteFill className="items-center justify-center bg-[#2b2b2b]">
            <Img
                src={staticFile("images/thumbnail_guild.jpg")}
                style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.2 // Faint background 
                }}
            />
            <Img
                src={staticFile("images/quest-red.png")}
                style={{ width: 400, transform: `scale(${logoScale})`, zIndex: 1 }}
            />
            <div style={{
                fontFamily: FONT_FAMILY,
                fontSize: 100,
                fontWeight: "bold",
                color: "white",
                marginTop: 50,
                opacity: textOpacity,
                zIndex: 1
            }}>
                {title}
            </div>
            <div style={{
                fontFamily: FONT_FAMILY,
                fontSize: 40,
                color: "#ffcccc",
                marginTop: 20,
                opacity: subTextOpacity,
                zIndex: 1
            }}>
                繝励Ο繧ｸ繧ｧ繧ｯ繝育ｮ｡逅・ｒ縲∝・髯ｺ縺ｫ螟峨∴繧・
            </div>
        </AbsoluteFill>
    );
};

const DashboardScene: React.FC = () => {
    const frame = useCurrentFrame();

    // Background scroll simulation
    const bgY = interpolate(frame, [0, 150], [0, -20]);
    const titleOpacity = interpolate(frame, [0, 20], [0, 1]);

    return (
        <AbsoluteFill className="bg-[#f0f0f0] p-10 items-center justify-center">
            <div className="absolute inset-0 opacity-40" style={{
                backgroundImage: `url(${staticFile("images/thumbnail_guild.jpg")})`,
                backgroundSize: "cover",
                transform: `translateY(${bgY}px)`
            }} />

            <div className="z-10 bg-white/90 p-10 rounded-xl shadow-2xl w-[80%] backdrop-blur-sm border-2 border-[#ccc]">
                <h2 style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: 50,
                    marginBottom: 40,
                    color: "#333",
                    textAlign: 'center',
                    opacity: titleOpacity,
                    fontWeight: 'bold'
                }}>
                    繝励Ο繧ｸ繧ｧ繧ｯ繝医・蛛･蜈ｨ諤ｧ繧偵せ繝・・繧ｿ繧ｹ蛹・
                </h2>
                <StatusBar label="AGI (騾ｲ謐・" value={80} color="#2563EB" delay={20} />
                <StatusBar label="HP (莠育ｮ・" value={45} color="#DC2626" delay={50} />
                <StatusBar label="EXP (繧ｿ繧ｹ繧ｯ螳御ｺ・" value={92} color="#EAB308" delay={80} />
            </div>
        </AbsoluteFill>
    );
};

const StatusBar: React.FC<{ label: string, value: number, color: string, delay: number }> = ({ label, value, color, delay }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const progress = spring({
        frame: frame - delay,
        fps,
        config: { damping: 200 }
    });

    // Clamp spring value between 0 and 1
    const actualWidth = interpolate(progress, [0, 1], [0, value]);

    return (
        <div style={{ marginBottom: 30 }}>
            <div style={{ fontFamily: FONT_FAMILY, fontSize: 30, marginBottom: 10, color: "#333", fontWeight: 'bold' }}>{label}</div>
            <div style={{ width: "100%", height: 35, backgroundColor: "#ddd", borderRadius: 10, overflow: "hidden", border: '1px solid #bbb' }}>
                <div style={{
                    width: `${Math.min(actualWidth, 100)}%`,
                    height: "100%",
                    backgroundColor: color,
                    borderRadius: 10,
                    boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.4)'
                }} />
            </div>
        </div>
    );
}

const CouncilScene: React.FC = () => {
    return (
        <AbsoluteFill>
            <Img src={staticFile("images/council_room_bg.png")} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />

            <div style={{
                position: 'absolute',
                top: 50,
                width: '100%',
                textAlign: 'center',
                color: 'white',
                fontSize: 60,
                fontWeight: 'bold',
                fontFamily: FONT_FAMILY,
                textShadow: '0 4px 10px rgba(0,0,0,0.8)',
                zIndex: 20,
                background: 'rgba(0,0,0,0.5)',
                padding: '10px 0'
            }}>
                AI隧戊ｭｰ莨壹↓繧医ｋ螟夊ｧ堤噪蛻・梵
            </div>

            <AbsoluteFill className="flex-row items-end justify-center pb-20 gap-10">
                <Character src="images/council_pmo.png" name="PMO" delay={10} text="騾ｲ謐鈴≦蟒ｶ縺ｮ繝ｪ繧ｹ繧ｯ縺碁ｫ倥∪縺｣縺ｦ縺・∪縺吶ゅ・繝ｭ繧ｻ繧ｹ驕ｵ螳医ｒ・・ side="left" />
                <Character src="images/council_sales.png" name="Sales" delay={60} text="縺ｧ繧ゅ♀螳｢讒倥・縺薙・譁ｰ讖溯・繧貞ｾ・▲縺ｦ縺ｾ縺呻ｼ√メ繝｣繝ｳ繧ｹ縺ｧ縺吶ｈ・・ side="right" />
                <Character src="images/council_manager.png" name="Manager" delay={110} text="繧医∽ｺ育ｮ励′... 驛ｨ髟ｷ縺ｫ縺ｪ繧薙※蝣ｱ蜻翫☆繧後・..." side="right" />
                <Character src="images/master_smile.png" name="Master" delay={160} text="縺・・縲ゅ↑繧峨・縲後ヵ繧ｧ繝ｼ繧ｺ蛻・牡縲阪→縺・≧鬲疲ｳ輔〒荵励ｊ蛻・ｋ縺ｮ縺倥ｃ" side="center" />
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

const Character: React.FC<{ src: string, name: string, delay: number, text: string, side: 'left' | 'right' | 'center' }> = ({ src, name, delay, text, side }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const scale = spring({ frame: frame - delay, fps, from: 0, to: 1 });
    const bubbleOpacity = interpolate(frame - delay, [10, 30], [0, 1], { extrapolateLeft: 'clamp' });

    // Auto hide bubble faster for this scene pace
    const bubbleHide = interpolate(frame - delay, [80, 90], [1, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
    const finalOpacity = bubbleOpacity * bubbleHide;

    return (
        <div style={{ transform: `scale(${Math.max(0, scale)})`, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {/* Chat Bubble */}
            <div style={{
                opacity: finalOpacity,
                position: 'absolute',
                bottom: 160,
                backgroundColor: 'white',
                padding: 15,
                borderRadius: 20,
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                width: 300,
                textAlign: 'center',
                fontFamily: FONT_FAMILY,
                fontSize: 20,
                fontWeight: 'bold',
                zIndex: 10,
                color: '#333',
                border: '2px solid #333'
            }}>
                {text}
                <div style={{
                    position: 'absolute',
                    bottom: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderLeft: '10px solid transparent',
                    borderRight: '10px solid transparent',
                    borderTop: '12px solid #333'
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: '10px solid white'
                }} />
            </div>

            <Img src={staticFile(src)} style={{ width: 140, height: 140, borderRadius: '50%', border: '4px solid white', boxShadow: '0 0 20px rgba(0,0,0,0.5)', backgroundColor: '#333', objectFit: 'cover' }} />
            <div style={{ marginTop: 10, backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '5px 15px', borderRadius: 10, fontFamily: FONT_FAMILY, fontSize: 18 }}>{name}</div>
        </div>
    );
}

const OutroScene: React.FC = () => {
    const frame = useCurrentFrame();
    const opacity = interpolate(frame, [0, 20], [0, 1]);

    return (
        <AbsoluteFill style={{ backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
            <Img src={staticFile("images/thumbnail_guild.jpg")} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.2 }} />
            <Img src={staticFile("images/quest-red.png")} style={{ width: 300, opacity }} />
            <div style={{ fontFamily: FONT_FAMILY, fontSize: 60, color: 'white', marginTop: 40, opacity, fontWeight: 'bold' }}>
                縺輔≠縲∵判逡･縺ｮ譌・∈
            </div>
            <div style={{ fontFamily: FONT_FAMILY, fontSize: 30, color: '#aaa', marginTop: 20, opacity }}>
                Project Quest - Available Now
            </div>
        </AbsoluteFill>
    );
}
