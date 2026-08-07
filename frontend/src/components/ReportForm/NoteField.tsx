import React from "react";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

/** Мікро-лейбл + невелика textarea (нотатки «Важливо», памʼятки до процедур). */
const NoteField: React.FC<Props> = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
  className = "",
}) => (
  <div className={className}>
    <p className="sub-label">{label}</p>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="field-textarea min-h-[60px] w-full resize-y text-sm"
    />
  </div>
);

export default NoteField;
