import AuthenticatedLayout from "#layouts/AuthenticatedLayout";
import PrivateRoute from "#router/PrivateRoute";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

// Lazy-loaded per page (not via the #pages/index barrel) so each route ships
// its own chunk instead of bundling Tiptap/reference managers into the
// login page's initial download.
const LoginPage = lazy(() => import("#pages/LoginPage"));
const PatientListPage = lazy(() => import("#pages/PatientListPage"));
const CreateReportPage = lazy(() => import("#pages/CreateReportPage"));
const ReferencePanel = lazy(() => import("#pages/references/ReferencePanel"));
const ErrorPage = lazy(() => import("#pages/ErrorPage"));
const NotFoundPage = lazy(() => import("#pages/NotFoundPage"));

export const AppRouter: React.FC = () => {
  return (
    <Suspense
      fallback={<p className="p-4 text-center text-sm">Завантаження...</p>}
    >
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
          <Route
            path="/create-report/:patientId"
            element={<CreateReportPage />}
          />
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
    </Suspense>
  );
};
