import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupGlobalErrorHandling } from "./lib/globalErrorHandling.ts";
import { setupSessionRefresh } from "./lib/sessionRefresh.ts";

setupGlobalErrorHandling();
setupSessionRefresh();

createRoot(document.getElementById("root")!).render(<App />);
