import React from "react";

interface Props {
  text: string;
}

const AuthButton: React.FC<Props> = ({ text }) => (
  <button type="submit" className="btn btn-primary w-full">
    {text}
  </button>
);

export default AuthButton;
