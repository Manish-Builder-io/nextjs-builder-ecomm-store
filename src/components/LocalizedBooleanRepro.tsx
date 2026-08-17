"use client";

import React from "react";

interface LocalizedBooleanReproProps {
  localizedFlag?: boolean | Record<string, unknown>;
  builderState?: {
    state?: Record<string, unknown>;
  };
}

export function LocalizedBooleanRepro(props: LocalizedBooleanReproProps) {
  const value = props.localizedFlag;

  return (
    <pre>
      locale: {JSON.stringify(props.builderState?.state?.locale)}
      {"\n"}
      localizedFlag: {JSON.stringify(value)}
      {"\n"}
      typeof: {typeof value}
    </pre>
  );
}

export default LocalizedBooleanRepro;
