import ReportSection from "#components/ReportForm/ReportSection";
import React from "react";

interface Props {
  comments: string;
  setComments: (value: string) => void;
}

const ReportComments: React.FC<Props> = ({ comments, setComments }) => (
  <ReportSection title="Додаткова інформація">
    <textarea
      aria-label="Додаткова інформація"
      value={comments}
      onChange={(e) => setComments(e.target.value)}
      rows={3}
      className="field-textarea min-h-[80px] w-full resize-y"
    />
  </ReportSection>
);

export default ReportComments;
