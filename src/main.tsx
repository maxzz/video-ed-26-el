import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './components/0-all/0-app.tsx';
import { initEditor } from './editor/0-core/2-lib/startup.ts';
import { initThemeSync } from './editor/1-layout/index.ts';
import { mainApi } from './editor/0-core/2-lib/main-api.ts';

await initEditor();
initThemeSync();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);

mainApi.rendererReady();
