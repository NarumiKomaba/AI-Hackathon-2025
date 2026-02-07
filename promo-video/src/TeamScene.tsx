import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const FONT_FAMILY = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export const TeamScene: React.FC = () => {
    const frame = useCurrentFrame();

    const titleOpacity = interpolate(frame, [0, 20], [0, 1]);

    return (
        <AbsoluteFill style={{ backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }}>
            <Img
                src={staticFile("images/thumbnail_guild.jpg")}
                style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.3
                }}
            />

            <div style={{ position: 'absolute', top: 50, fontFamily: FONT_FAMILY, fontSize: 50, color: 'white', fontWeight: 'bold', opacity: titleOpacity }}>
                スキルを可視化して最適なパ�EチE��編戁E
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', gap: 40, marginTop: 50, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <MemberCard name="Knight" role="Backend" src="images/knight.jpg" delay={10} stats={{ str: 90, int: 40 }} />
                <MemberCard name="Wizard" role="AI Eng" src="images/wizard.jpg" delay={60} stats={{ str: 30, int: 95 }} />
                <MemberCard name="Archer" role="Frontend" src="images/archer.jpg" delay={110} stats={{ str: 70, int: 70 }} />
            </div>
        </AbsoluteFill>
    );
};

const MemberCard: React.FC<{ name: string, role: string, src: string, delay: number, stats: { str: number, int: number } }> = ({ name, role, src, delay, stats }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const opacity = spring({ frame: frame - delay, fps, from: 0, to: 1 });
    const scale = spring({ frame: frame - delay, fps, from: 0.8, to: 1 });

    return (
        <div style={{
            opacity,
            transform: `scale(${scale})`,
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: 20,
            borderRadius: 15,
            border: '1px solid rgba(255,255,255,0.2)',
            width: 250,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <Img src={staticFile(src)} style={{ width: 100, height: 100, borderRadius: '50%', border: '3px solid white', objectFit: 'cover' }} />
            <div style={{ color: 'white', fontFamily: FONT_FAMILY, fontSize: 24, fontWeight: 'bold', marginTop: 10 }}>{name}</div>
            <div style={{ color: '#aaa', fontFamily: FONT_FAMILY, fontSize: 18, marginBottom: 15 }}>{role}</div>

            <SkillBar label="STR" value={stats.str} color="#ef4444" delay={delay + 10} />
            <SkillBar label="INT" value={stats.int} color="#3b82f6" delay={delay + 20} />
        </div>
    );
};

const SkillBar: React.FC<{ label: string, value: number, color: string, delay: number }> = ({ label, value, color, delay }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const progress = spring({ frame: frame - delay, fps, config: { damping: 20 } });
    const width = interpolate(progress, [0, 1], [0, value]);

    return (
        <div style={{ width: '100%', marginBottom: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ddd', fontSize: 12, marginBottom: 2, fontFamily: FONT_FAMILY }}>
                <span>{label}</span>
                <span>{Math.round(width)}</span>
            </div>
            <div style={{ width: '100%', height: 6, backgroundColor: '#444', borderRadius: 3 }}>
                <div style={{ width: `${Math.min(width, 100)}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
            </div>
        </div>
    );
};
