import React from "react";

export interface TextColumnItem {
  headline?: string;
  bodyText?: string;
  textColumnAlignment?: "Left" | "Center" | "Right" | string;
  textRowAlignment?: "Top" | "Middle" | "Bottom" | string;
  backgroundColor?: "White" | "Grey" | "Black" | string;
}

export interface TextColumnsProps {
  sectionTitle?: string;
  textColumns?: TextColumnItem[];
  localizedSubfieldColumns?: TextColumnItem[];
}

const BACKGROUND_COLOR_CLASSES: Record<string, string> = {
  White: "bg-white text-black",
  Grey: "bg-gray-100 text-black",
  Black: "bg-black text-white",
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

function TextColumn({ column }: { column: TextColumnItem }) {
  const backgroundClass =
    BACKGROUND_COLOR_CLASSES[column.backgroundColor ?? "White"] ?? "bg-white text-black";
  const columnAlignClass =
    COLUMN_ALIGNMENT_CLASSES[column.textColumnAlignment ?? "Left"] ?? "items-start text-left";
  const rowAlignClass =
    ROW_ALIGNMENT_CLASSES[column.textRowAlignment ?? "Bottom"] ?? "justify-end";

  return (
    <div
      className={`flex h-full min-h-[200px] flex-1 flex-col gap-2 rounded-2xl p-6 ${backgroundClass} ${columnAlignClass} ${rowAlignClass}`}
    >
      {column.headline ? <h3 className="text-xl font-semibold">{column.headline}</h3> : null}
      {column.bodyText ? <p className="text-sm opacity-90">{column.bodyText}</p> : null}
    </div>
  );
}

export function TextColumns({
  sectionTitle,
  textColumns = [],
  localizedSubfieldColumns = [],
}: TextColumnsProps) {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {sectionTitle ? (
        <h2 className="mb-6 text-2xl font-bold text-black">{sectionTitle}</h2>
      ) : null}

      {textColumns.length > 0 ? (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          {textColumns.map((column, index) => (
            <TextColumn key={index} column={column} />
          ))}
        </div>
      ) : null}

      {localizedSubfieldColumns.length > 0 ? (
        <div className="flex flex-col gap-4 sm:flex-row">
          {localizedSubfieldColumns.map((column, index) => (
            <TextColumn key={index} column={column} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default TextColumns;
