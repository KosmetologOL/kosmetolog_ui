import React, { useState } from "react";

interface ExpandableTextProps {
  text: string;
  limit?: number;
  className?: string;
}

export const ExpandableText: React.FC<ExpandableTextProps> = ({
  text,
  limit = 210,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text || text.length <= limit) {
    return <div className={className}>{text}</div>;
  }

  const displayText = isExpanded ? text : `${text.slice(0, limit).trim()}...`;

  return (
    <div className={`flex flex-col items-start gap-1.5 ${className}`}>
      <div className="leading-relaxed">{displayText}</div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded((prev) => !prev);
        }}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand bg-brand-soft/50 hover:bg-brand-soft px-2.5 py-1 rounded-md transition-all cursor-pointer border border-brand/20 active:scale-95"
      >
        <span>{isExpanded ? "Згорнути опис" : "Розгорнути опис"}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
};

export default ExpandableText;
