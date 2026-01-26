import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const FONT_FAMILY = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export const RequirementsScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Document animation (Requirements)
    const docScale = spring({ frame: frame - 10, fps, from: 0, to: 1, config: { damping: 12 } });
    const docOpacity = interpolate(frame, [10, 30, 90, 110], [0, 1, 1, 0]);

    // Project Board animation (Generated Info)
    const boardScale = spring({ frame: frame - 110, fps, from: 0.5, to: 1, config: { damping: 12 } });
    const boardOpacity = interpolate(frame, [110, 130], [0, 1]);

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

            {/* Part 1: Requirements Document */}
            <div style={{ opacity: docOpacity, transform: `scale(${docScale})`, position: 'absolute', alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
                <Img src={staticFile("images/make-blue.png")} style={{ width: 200 }} />
                <div style={{ fontFamily: FONT_FAMILY, fontSize: 50, color: 'white', marginTop: 30, fontWeight: 'bold', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                    要件定義書をアチE�EローチE
                </div>
            </div>

            {/* Part 2: Generated Project Board */}
            <div style={{ opacity: boardOpacity, transform: `scale(${boardScale})`, position: 'absolute', alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
                <Img src={staticFile("images/board-dark.png")} style={{ width: 400, boxShadow: '0 0 50px rgba(50, 100, 255, 0.5)', borderRadius: 20 }} />
                <div style={{ fontFamily: FONT_FAMILY, fontSize: 60, color: '#4da6ff', marginTop: 40, fontWeight: 'bold', textShadow: '0 4px 20px rgba(77, 166, 255, 0.6)' }}>
                    プロジェクト情報が�E動生戁E
                </div>
            </div>
        </AbsoluteFill>
    );
};
