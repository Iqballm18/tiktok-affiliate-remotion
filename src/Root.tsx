import { Composition } from "remotion";
import {
  AffiliateVideo,
  affiliateSchema,
  calculateAffiliateMetadata,
  defaultAffiliateProps,
} from "./AffiliateVideo";
import { StyleGallery, GALLERY_DURATION } from "./affiliate-styles/StyleGallery";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="StyleGallery"
        component={StyleGallery}
        durationInFrames={GALLERY_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
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
