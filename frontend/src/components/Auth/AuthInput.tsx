import React from "react";

interface Props {
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const AuthInput: React.FC<Props> = ({ type, placeholder, value, onChange }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className="field-input"
  />
);

export default AuthInput;
