import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/0-all/0-app";
import { initEditor } from "./main-ini-startup";
import { initThemeSync } from "./utils/local-utils/theme-sync";
import { mainApi } from "./editor/0-core/7-actions/0-main-api";
import { loadViewsSideEffects } from "./views-load-side-effects";
import "./index.css";

await initEditor();
initThemeSync();
loadViewsSideEffects();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);

mainApi.rendererReady();
