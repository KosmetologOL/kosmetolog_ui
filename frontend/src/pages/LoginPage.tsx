import LoginForm from "#components/Auth/LoginForm";
import FullScreenLoader from "#components/FullScreenLoader";
import { useAuth } from "#hooks/useAuth";
import React from "react";
import { Navigate } from "react-router-dom";

const LoginPage: React.FC = () => {
  const { token, authReady } = useAuth();

  // Токен більше не читається з localStorage, тож на першому рендері він
  // завжди null — без цього гейта форма входу встигала блимнути тим, у кого
  // сесія ще відновлюється через /auth/refresh (як і в PrivateRoute).
  if (!authReady) return <FullScreenLoader />;

  if (token) return <Navigate to="/patients" replace />;

  return <LoginForm />;
};

export default LoginPage;
