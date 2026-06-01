import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { token, user, authReady } = useAuth();

  if (!authReady) {
    return <p className="p-4 text-center text-sm">Завантаження...</p>;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const normalizedRole = user.role?.toLowerCase() ?? "user";

  if (
    allowedRoles &&
    !allowedRoles.map((role) => role.toLowerCase()).includes(normalizedRole)
  ) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
