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
          <Toaster position="top-right" />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
