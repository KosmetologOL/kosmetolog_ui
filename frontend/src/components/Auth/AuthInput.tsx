import React from "react";

interface Props {
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  autoComplete?: string;
  "aria-label"?: string;
  error?: string;
  errorId?: string;
}

const AuthInput: React.FC<Props> = ({
  type,
  placeholder,
  value,
  onChange,
  name,
  autoComplete,
  "aria-label": ariaLabel,
  error,
  errorId,
}) => (
  <div>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      name={name}
      autoComplete={autoComplete}
      aria-label={ariaLabel}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      className={`field-input${error ? " is-invalid" : ""}`}
    />
    {error && (
      <p id={errorId} className="field-error">
        {error}
      </p>
    )}
  </div>
);

export default AuthInput;
