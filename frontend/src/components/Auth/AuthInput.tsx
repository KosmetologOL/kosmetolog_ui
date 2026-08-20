import { IconEye, IconEyeOff } from "#components/icons";
import React, { useState } from "react";

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
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const isPassword = type === "password";

  const input = (
    <input
      type={isPassword && isRevealed ? "text" : type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      name={name}
      autoComplete={autoComplete}
      aria-label={ariaLabel}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      className={`field-input${isPassword ? " pr-11" : ""}${
        error ? " is-invalid" : ""
      }`}
    />
  );

  return (
    <div>
      {isPassword ? (
        <div className="relative">
          {input}
          <button
            type="button"
            onClick={() => setIsRevealed((prev) => !prev)}
            aria-label={isRevealed ? "Приховати пароль" : "Показати пароль"}
            aria-pressed={isRevealed}
            title={isRevealed ? "Приховати пароль" : "Показати пароль"}
            className="icon-btn absolute top-1/2 right-1.5 -translate-y-1/2 text-ink-soft hover:bg-surface-2 hover:text-ink"
          >
            {isRevealed ? <IconEyeOff /> : <IconEye />}
          </button>
        </div>
      ) : (
        input
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
};

export default AuthInput;
