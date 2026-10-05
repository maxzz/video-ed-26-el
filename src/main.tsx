import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/0-all/0-app.tsx';
import { initEditor } from './main-ini-startup.ts';
import { initThemeSync } from './utils/local-utils/theme-sync.ts';
import { mainApi } from './editor/0-core/8-lib/main-api.ts';
import { loadViewsSideEffects } from './views-load-side-effects/index.ts';
import './index.css';

await initEditor();
initThemeSync();
loadViewsSideEffects();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);

mainApi.rendererReady();
