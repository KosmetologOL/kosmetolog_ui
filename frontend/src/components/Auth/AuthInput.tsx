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
    className="w-full rounded-lg border border-green-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 md:px-4 md:py-3 md:text-base"
  />
);

export default AuthInput;
