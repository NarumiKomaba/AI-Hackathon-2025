import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const FONT_FAMILY = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export const ReportScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Scene transition
    const mainOpacity = interpolate(frame, [0, 20], [0, 1]);

    // Report appearance
    const reportScale = spring({ frame: frame - 60, fps, from: 0, to: 1, config: { damping: 12 } });

    return (
        <AbsoluteFill style={{ backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', opacity: mainOpacity }}>
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

            <div style={{ position: 'absolute', top: 80, width: '100%', textAlign: 'center', fontFamily: FONT_FAMILY, fontSize: 50, color: 'white', fontWeight: 'bold' }}>
                譌･縲・・蝣ｱ蜻翫ｂ繝ｯ繝ｳ繧ｯ繝ｪ繝・け縺ｧ逕滓・
            </div>

            {/* Flying tasks animation */}
            {/* Generating multiple flying icons that merge into the center */}
            {[...Array(6)].map((_, i) => (
                <FlyingIcon key={i} index={i} total={6} />
            ))}

            {/* Final Report */}
            <div style={{ transform: `scale(${reportScale})`, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Img src={staticFile("images/complete.png")} style={{ width: 200, filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))' }} />
                <div style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: 40,
                    color: '#ffd700',
                    fontWeight: 'bold',
                    marginTop: 20,
                    opacity: interpolate(frame, [70, 90], [0, 1])
                }}>
                    REPORT GENERATED!
                </div>
            </div>
        </AbsoluteFill>
    );
};

const FlyingIcon: React.FC<{ index: number, total: number }> = ({ index, total }) => {
    const frame = useCurrentFrame();

    const startAngle = (index / total) * 2 * Math.PI;
    const radius = 400; // Start distance

    const moveProgress = interpolate(frame, [10, 60], [0, 1], { extrapolateRight: 'clamp' });

    const x = Math.cos(startAngle) * radius * (1 - moveProgress);
    const y = Math.sin(startAngle) * radius * (1 - moveProgress);

    // Disappear when reaching center
    const opacity = interpolate(moveProgress, [0.8, 1], [1, 0]);

    return (
        <Img
            src={staticFile("images/sub-blue.png")}
            style={{
                position: 'absolute',
                width: 60,
                transform: `translate(${x}px, ${y}px)`,
                opacity
            }}
        />
    );
};
