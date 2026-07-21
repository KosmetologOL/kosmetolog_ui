import React from "react";

interface Props {
  comments: string;
  setComments: (value: string) => void;
}

const ReportComments: React.FC<Props> = ({ comments, setComments }) => (
  <div className="card">
    <p className="section-label">Додаткова інформація</p>
    <textarea
      value={comments}
      onChange={(e) => setComments(e.target.value)}
      rows={3}
      className="field-textarea w-full"
    />
  </div>
);

export default ReportComments;
