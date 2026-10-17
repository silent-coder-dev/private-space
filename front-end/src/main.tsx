import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/notify";

createRoot(document.getElementById("root")!).render(<App />);
// Notifications while the app is in the background (calls, messages, hearts).
void registerServiceWorker();
