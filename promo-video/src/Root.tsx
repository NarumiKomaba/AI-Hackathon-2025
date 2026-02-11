import "./index.css";
import { Composition } from "remotion";
import { PromoVideo, promoSchema } from "./PromoVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
    </>
  );
};
