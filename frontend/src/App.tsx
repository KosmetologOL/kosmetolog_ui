import ErrorBoundary from "#components/ErrorBoundary";
import { AuthProvider } from "#context/AuthProvider";
import { AppRouter } from "#router/AppRouter";
import React from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <AppRouter />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "var(--color-surface)",
                color: "var(--color-ink)",
                border: "1px solid var(--color-line-strong)",
                borderRadius: "0.75rem",
                padding: "0.75rem 1rem",
                fontSize: "0.9375rem",
                fontWeight: 500,
                boxShadow: "var(--shadow-lift)",
              },
              success: {
                iconTheme: {
                  primary: "var(--color-brand)",
                  secondary: "var(--color-paper)",
                },
              },
              error: {
                iconTheme: {
                  primary: "var(--color-danger)",
                  secondary: "var(--color-paper)",
                },
              },
            }}
          />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
