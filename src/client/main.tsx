import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { App } from "./App";

Sentry.init({
  dsn: "https://05a20adb0c4f0864435ef97ff8de2c60@o4510650299842560.ingest.us.sentry.io/4510995919732736",
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 1.0,
  environment: import.meta.env.MODE,
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);
