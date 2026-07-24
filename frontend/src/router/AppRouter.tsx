import {
  CreateReportPage,
  ErrorPage,
  LoginPage,
  NotFoundPage,
  PatientListPage,
  ReferencePanel,
} from "#pages/index";
import AuthenticatedLayout from "#layouts/AuthenticatedLayout";
import PrivateRoute from "#router/PrivateRoute";
import { Route, Routes } from "react-router-dom";

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <PrivateRoute>
            <AuthenticatedLayout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<PatientListPage />} />
        <Route path="/patients" element={<PatientListPage />} />
        <Route path="/create-report/:patientId" element={<CreateReportPage />} />
      </Route>

      <Route
        element={
          <PrivateRoute allowedRoles={["admin", "doctor"]}>
            <AuthenticatedLayout />
          </PrivateRoute>
        }
      >
        <Route path="/references" element={<ReferencePanel />} />
      </Route>

      <Route path="/error" element={<ErrorPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
