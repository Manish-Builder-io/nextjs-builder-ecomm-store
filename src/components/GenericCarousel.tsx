import React from "react";
import Link from "next/link";

export interface CarouselSlide {
  id?: string;
  imageUrl?: string;
  altText?: string;
  title?: string;
  description?: string;
  link?: string;
  backgroundColor?: "Highlight" | "Neutral" | "Dark" | "Light" | string;
  textFontColor?: "Black" | "White" | string;
  textColumnAlignment?: "Left" | "Center" | "Right" | string;
  textRowAlignment?: "Top" | "Middle" | "Bottom" | string;
  hasGradientShadow?: boolean;
}

export interface GenericCarouselProps {
  slidesPerPage?: "Auto" | "1" | "2" | "3" | "4" | string;
  slides?: CarouselSlide[];
  disableHorizontalScroll?: boolean;
  disableClick?: boolean;
  maxSlideHeight?: number;
  removePadding?: boolean;
}

const BACKGROUND_COLOR_CLASSES: Record<string, string> = {
  Highlight: "bg-amber-100",
  Neutral: "bg-gray-100",
  Dark: "bg-gray-900",
  Light: "bg-white",
};

const TEXT_COLOR_CLASSES: Record<string, string> = {
  Black: "text-black",
  White: "text-white",
};

const COLUMN_ALIGNMENT_CLASSES: Record<string, string> = {
  Left: "items-start text-left",
  Center: "items-center text-center",
  Right: "items-end text-right",
};

const ROW_ALIGNMENT_CLASSES: Record<string, string> = {
  Top: "justify-start",
  Middle: "justify-center",
  Bottom: "justify-end",
};

function SlideCard({
  slide,
  disableClick,
  maxSlideHeight,
  widthStyle,
}: {
  slide: CarouselSlide;
  disableClick?: boolean;
  maxSlideHeight?: number;
  widthStyle: React.CSSProperties;
}) {
  const backgroundClass =
    BACKGROUND_COLOR_CLASSES[slide.backgroundColor ?? "Highlight"] ??
    "bg-amber-100";
  const textColorClass = TEXT_COLOR_CLASSES[slide.textFontColor ?? "Black"] ?? "text-black";
  const columnAlignClass =
    COLUMN_ALIGNMENT_CLASSES[slide.textColumnAlignment ?? "Left"] ?? "items-start text-left";
  const rowAlignClass =
    ROW_ALIGNMENT_CLASSES[slide.textRowAlignment ?? "Bottom"] ?? "justify-end";

  const content = (
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden rounded-2xl ${backgroundClass}`}
      style={{ height: maxSlideHeight ? `${maxSlideHeight}px` : undefined }}
    >
      {slide.imageUrl ? (
        <img
          src={slide.imageUrl}
          alt={slide.altText || slide.title || ""}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      {slide.hasGradientShadow ? (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      ) : null}

      <div
        className={`relative flex h-full w-full flex-col gap-2 p-6 ${columnAlignClass} ${rowAlignClass}`}
      >
        {slide.title ? (
          <h3 className={`text-xl font-semibold ${textColorClass}`}>{slide.title}</h3>
        ) : null}
        {slide.description ? (
          <p className={`text-sm ${textColorClass} opacity-90`}>{slide.description}</p>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="flex-shrink-0 snap-start" style={widthStyle}>
      {slide.link && !disableClick ? (
        <Link href={slide.link} className="block h-full w-full">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}

export function GenericCarousel({
  slidesPerPage = "Auto",
  slides = [],
  disableHorizontalScroll = false,
  disableClick = false,
  maxSlideHeight = 550,
  removePadding = true,
}: GenericCarouselProps) {
  const slidesPerPageNumber = Number(slidesPerPage);
  const isFixedSlideCount = !Number.isNaN(slidesPerPageNumber) && slidesPerPageNumber > 0;

  const widthStyle: React.CSSProperties = isFixedSlideCount
    ? { width: `calc((100% - ${(slidesPerPageNumber - 1) * 16}px) / ${slidesPerPageNumber})` }
    : { width: "280px" };

  return (
    <div className={removePadding ? "" : "px-4 py-6 sm:px-6 lg:px-8"}>
      <div
        className={
          disableHorizontalScroll
            ? "flex flex-wrap gap-4"
            : "flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        }
      >
        {slides.map((slide, index) => (
          <SlideCard
            key={slide.id ?? index}
            slide={slide}
            disableClick={disableClick}
            maxSlideHeight={maxSlideHeight}
            widthStyle={widthStyle}
          />
        ))}
      </div>
    </div>
  );
}

export default GenericCarousel;
