"use client";

import { BuilderBlocks, Builder } from "@builder.io/react";
import React, { FC } from "react";
import VerticalTab from "./VerticalTab";

interface Tab {
  label: string;
  blocks: unknown[];
}

interface NextItem {
  displayNextItemLink?: boolean;
  nextItemText?: string;
}

interface VerticalTabBlockProps {
  tabs?: Tab[];
  theme?: "gray" | "black" | "white";
  tabHeader?: string;
  shownFeatures?: number;
  pagerLabel?: string;
  nextItem?: NextItem;
  builderBlock?: { id: string };
  attributes?: Record<string, unknown>;
}

const VerticalTabBlock: FC<VerticalTabBlockProps> = ({
  tabs,
  theme,
  tabHeader,
  nextItem,
  shownFeatures,
  pagerLabel,
  builderBlock,
  attributes,
}) => {
  return (
    <section data-theme={theme} {...attributes}>
      <VerticalTab
        tabs={tabs}
        theme={theme}
        tabHeader={tabHeader}
        nextItem={nextItem}
        shownFeatures={shownFeatures}
        pagerLabel={pagerLabel}
        tabClickOverride={Builder.isEditing}
      >
        {tabs?.map((tab, index) => (
          <div key={`${builderBlock?.id}-${tab.label}-${index}`}>
            <BuilderBlocks
              parentElementId={builderBlock?.id}
              dataPath={`component.options.tabs.${index}.blocks`}
              blocks={tab.blocks || []}
            />
          </div>
        ))}
      </VerticalTab>
    </section>
  );
};

export default VerticalTabBlock;
