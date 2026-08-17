import React from "react";

interface BannerBackgroundImage {
  src?: string;
  alt?: string;
  altText?: string;
}

interface BannerSide {
  header?: string;
  subheader?: string;
  backgroundImage?: BannerBackgroundImage;
}

interface TwoUpBannerProps {
  leftContent?: BannerSide;
  rightContent?: BannerSide;
}

function BannerPanel({ header, subheader, backgroundImage }: BannerSide) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
      {backgroundImage?.src && (
        <img
          src={backgroundImage.src}
          alt={backgroundImage.alt || backgroundImage.altText || ""}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {(header || subheader) && (
        <div className="absolute inset-x-0 bottom-0 p-6 text-white bg-gradient-to-t from-black/60 to-transparent">
          {header && <h2 className="text-2xl font-semibold">{header}</h2>}
          {subheader && <p className="mt-1 text-sm">{subheader}</p>}
        </div>
      )}
    </div>
  );
}

export function TwoUpBanner({ leftContent, rightContent }: TwoUpBannerProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <BannerPanel {...leftContent} />
      <BannerPanel {...rightContent} />
    </section>
  );
}

export default TwoUpBanner;
