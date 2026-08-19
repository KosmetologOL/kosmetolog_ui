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
}

const AuthInput: React.FC<Props> = ({
  type,
  placeholder,
  value,
  onChange,
  name,
  autoComplete,
  "aria-label": ariaLabel,
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
      className={isPassword ? "field-input pr-11" : "field-input"}
    />
  );

  if (!isPassword) return input;

  return (
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
  );
};

export default AuthInput;
