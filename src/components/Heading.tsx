import React from "react";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
type HeadingAlign = "left" | "center" | "right";

interface HeadingProps {
  text?: string;
  level?: HeadingLevel;
  align?: HeadingAlign;
}

const levelClasses: Record<HeadingLevel, string> = {
  h1: "text-4xl font-semibold tracking-tight",
  h2: "text-3xl font-semibold tracking-tight",
  h3: "text-2xl font-semibold tracking-tight",
  h4: "text-xl font-semibold tracking-tight",
  h5: "text-lg font-semibold tracking-tight",
  h6: "text-base font-semibold tracking-tight",
};

const alignClasses: Record<HeadingAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function Heading({
  text = "Add a headline",
  level = "h2",
  align = "left",
}: HeadingProps) {
  const Tag = level;

  return (
    <Tag className={`${levelClasses[level]} ${alignClasses[align]}`}>
      {text}
    </Tag>
  );
}

export default Heading;

