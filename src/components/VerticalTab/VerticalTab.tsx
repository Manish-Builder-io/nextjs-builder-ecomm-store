"use client";

import React, { useState } from "react";

interface VerticalTabItem {
  label: string;
}

interface NextItem {
  displayNextItemLink?: boolean;
  nextItemText?: string;
}

interface VerticalTabProps {
  tabs?: VerticalTabItem[];
  tabHeader?: string;
  theme?: "gray" | "black" | "white";
  shownFeatures?: number;
  pagerLabel?: string;
  nextItem?: NextItem;
  tabClickOverride?: boolean;
  children?: React.ReactNode;
}

const VerticalTab: React.FC<VerticalTabProps> = ({
  tabs = [],
  tabHeader,
  shownFeatures = 4,
  pagerLabel = "View More Features",
  nextItem,
  tabClickOverride = false,
  children,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [visibleStart, setVisibleStart] = useState(0);

  if (!tabs || tabs.length === 0) {
    return <span>No tabs found, please add some</span>;
  }

  const visibleTabs = tabs.slice(visibleStart, visibleStart + shownFeatures);
  const hasMore = visibleStart + shownFeatures < tabs.length;
  const hasPrev = visibleStart > 0;

  const childArray = React.Children.toArray(children);

  const handleTabClick = (index: number) => {
    if (!tabClickOverride) {
      setActiveTab(visibleStart + index);
    }
  };

  const handleNext = () => {
    setVisibleStart((prev) => Math.min(prev + shownFeatures, tabs.length - shownFeatures));
  };

  const handlePrev = () => {
    setVisibleStart((prev) => Math.max(prev - shownFeatures, 0));
  };

  return (
    <div className="flex gap-6 w-full">
      <nav className="flex flex-col min-w-[180px] w-[220px] shrink-0">
        {tabHeader && (
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3 px-3">
            {tabHeader}
          </h3>
        )}

        <ul className="flex flex-col gap-1">
          {visibleTabs.map((tab, i) => {
            const globalIndex = visibleStart + i;
            const isActive = activeTab === globalIndex;
            return (
              <li key={`${tab.label}-${globalIndex}`}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleTabClick(i)}
                  className={[
                    "w-full text-left px-4 py-2.5 text-sm font-medium rounded transition-colors focus:outline-none",
                    isActive
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              </li>
            );
          })}
        </ul>

        {(hasPrev || hasMore) && (
          <div className="flex flex-col gap-1 mt-2">
            {hasPrev && (
              <button
                type="button"
                onClick={handlePrev}
                className="text-xs text-gray-500 hover:text-gray-800 px-4 py-1.5 text-left transition-colors"
              >
                &#8593; Previous
              </button>
            )}
            {hasMore && (
              <button
                type="button"
                onClick={handleNext}
                className="text-xs text-gray-500 hover:text-gray-800 px-4 py-1.5 text-left transition-colors"
              >
                {pagerLabel} &#8595;
              </button>
            )}
          </div>
        )}

        {nextItem?.displayNextItemLink && (
          <div className="mt-4 px-4">
            <span className="text-sm text-gray-500 cursor-pointer hover:text-gray-800 transition-colors">
              {nextItem.nextItemText}
            </span>
          </div>
        )}
      </nav>

      <div className="flex-1 min-w-0" role="tabpanel">
        {childArray[activeTab] ?? null}
      </div>
    </div>
  );
};

export default VerticalTab;
