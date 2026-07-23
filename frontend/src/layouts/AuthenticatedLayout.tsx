import AppShell from "#layouts/AppShell";
import React from "react";
import { Outlet } from "react-router-dom";

const AuthenticatedLayout: React.FC = () => (
  <AppShell>
    <Outlet />
  </AppShell>
);

export default AuthenticatedLayout;
