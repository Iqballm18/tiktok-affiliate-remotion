import { Composition } from "remotion";
import {
  AffiliateVideo,
  affiliateSchema,
  calculateAffiliateMetadata,
  defaultAffiliateProps,
} from "./AffiliateVideo";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TikTokAffiliate"
        component={AffiliateVideo}
        calculateMetadata={calculateAffiliateMetadata}
        schema={affiliateSchema}
        durationInFrames={24 * 60} // 24 detik @ 60fps
        fps={60}
        width={1080}
        height={1920}
        defaultProps={defaultAffiliateProps}
      />
      <Composition
        id="AffiliateVideo"
        component={AffiliateVideo}
        calculateMetadata={calculateAffiliateMetadata}
        schema={affiliateSchema}
        durationInFrames={24 * 60} // 24 detik @ 60fps
        fps={60}
        width={1080}
        height={1920}
        defaultProps={defaultAffiliateProps}
      />
    </>
  );
};
