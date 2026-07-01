import {
  CreateReportPage,
  ErrorPage,
  LoginPage,
  NotFoundPage,
  PatientListPage,
  ReferencePanel,
} from "#pages/index";
import PrivateRoute from "#router/PrivateRoute";
import { Route, Routes } from "react-router-dom";

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/patients"
        element={
          <PrivateRoute>
            <PatientListPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/create-report/:patientId"
        element={
          <PrivateRoute>
            <CreateReportPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <PatientListPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/references"
        element={
          <PrivateRoute allowedRoles={["admin", "doctor"]}>
            <ReferencePanel />
          </PrivateRoute>
        }
      />
      <Route path="/error" element={<ErrorPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
