import React from "react";

interface Props {
  text: React.ReactNode;
  disabled?: boolean;
}

const AuthButton: React.FC<Props> = ({ text, disabled }) => (
  <button type="submit" disabled={disabled} className="btn btn-primary w-full">
    {text}
  </button>
);

export default AuthButton;
