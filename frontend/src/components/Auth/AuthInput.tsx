import React from "react";

interface Props {
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  autoComplete?: string;
  "aria-label"?: string;
}

const AuthInput: React.FC<Props> = ({
  type,
  placeholder,
  value,
  onChange,
  name,
  autoComplete,
  "aria-label": ariaLabel,
}) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    name={name}
    autoComplete={autoComplete}
    aria-label={ariaLabel}
    className="field-input"
  />
);

export default AuthInput;
