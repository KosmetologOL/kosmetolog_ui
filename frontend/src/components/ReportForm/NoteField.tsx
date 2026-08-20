import React, { useId } from "react";

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
}) => {
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className="sub-label">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="field-textarea min-h-[60px] w-full resize-y text-sm"
      />
    </div>
  );
};

export default NoteField;
