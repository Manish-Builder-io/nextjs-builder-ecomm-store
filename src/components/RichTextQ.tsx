"use client";

import React from "react";

interface RichTextQProps {
  quill?: string;
}

export function RichTextQ({
  quill = "<p><a id='1' name='1'></a></p><h2>What Are the Benefits of Using an Airalo eSIM?</h2>",
}: RichTextQProps) {
  if (!quill) return null;

  return (
    <div
      className="prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: quill }}
    />
  );
}

export default RichTextQ;
