"use client";

import { BuilderBlocks } from "@builder.io/react";
import React, { useState } from "react";

interface Tab {
  label: string;
  tabContent: unknown[];
}

interface SizeChartTabsProps {
  tabs?: Tab[];
  builderBlock?: { id: string };
}

const SizeChartTabs: React.FC<SizeChartTabsProps> = (props) => {
  console.log("🚀 ~ SizeChartTabs ~ props:", props);
  const [activeTab, setActiveTab] = useState(0);

  try {
    if (!props?.tabs || props.tabs.length === 0) {
      return <span>No tabs found, please add some</span>;
    }

    return (
      <div>
        <div className="flex flex-wrap border-b border-gray-200">
          {props.tabs.map((tab, index) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-label={tab.label}
              aria-selected={activeTab === index}
              tabIndex={activeTab === index ? 0 : -1}
              onClick={() => setActiveTab(index)}
              className={[
                "px-5 py-3 text-sm font-medium transition-colors focus:outline-none",
                activeTab === index
                  ? "border-b-2 border-gray-900 text-gray-900"
                  : "text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {props.tabs[activeTab]?.tabContent && (
          <BuilderBlocks
            parentElementId={props.builderBlock?.id}
            dataPath={`component.options.tabs.${activeTab}.tabContent`}
            blocks={props.tabs[activeTab].tabContent}
          />
        )}
      </div>
    );
  } catch (error) {
    console.error(error);
    return <span>Error loading SizeChartTabs</span>;
  }
};

export default SizeChartTabs;
