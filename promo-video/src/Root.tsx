import "./index.css";
import { Composition } from "remotion";
import { PromoVideo, promoSchema } from "./PromoVideo";
import { FinalDemo } from "./FinalDemo";
import { LongDemo } from "./LongDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FinalDemo"
        component={FinalDemo}
        durationInFrames={8730} // 4:41 (音声8終了) + 10s = 291s * 30fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="LongDemo"
        component={LongDemo}
        durationInFrames={6300} // 3分30秒 (210s * 30fps)
        fps={30}
        width={1920}
        height={1080}
      />
      {/* 
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={1020} // 34 seconds
        fps={30}
        width={1920}
        height={1080}
        schema={promoSchema}
        defaultProps={{
          title: "Project Quest",
        }}
      />
      */}
    </>
  );
};
