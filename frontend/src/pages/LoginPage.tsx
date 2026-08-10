import LoginForm from "#components/Auth/LoginForm";
import { useAuth } from "#hooks/useAuth";
import React from "react";
import { Navigate } from "react-router-dom";

const LoginPage: React.FC = () => {
  const { token } = useAuth();

  if (token) return <Navigate to="/patients" replace />;

  return <LoginForm />;
};

export default LoginPage;
