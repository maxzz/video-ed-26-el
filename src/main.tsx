import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './components/0-all/0-app.tsx';
import { initEditor } from './main-ini-startup.ts';
import { initThemeSync, registerToggleActions } from './main-ini-togles.ts';
import { mainApi } from './editor/0-core/8-lib/main-api.ts';
import { "2-file-register" as registerFile } from './editor/2-file/index.ts';
import { "3-player-register" as registerPlayer } from './editor/3-player/index.ts';
import { "4-timeline-register" as registerTimeline } from './editor/4-timeline/index.ts';
import { "5-segments-register" as registerSegments } from './editor/5-segments/index.ts';
import { "6-streams-register" as registerStreams } from './editor/6-streams/index.ts';
import { "7-export-register" as registerExport } from './editor/7-export/index.ts';
import { "8-concat-register" as registerConcat } from './editor/8-concat/index.ts';
import { "9-edl-register" as registerEdl } from './editor/9-edl/index.ts';
import { "a-capture-register" as registerCapture } from './editor/a-capture/index.ts';
import { "b-detect-register" as registerDetect } from './editor/b-detect/index.ts';
import { "c-keyboard-register" as registerKeyboard } from './editor/c-keyboard/index.ts';
import { "d-settings-register" as registerSettings } from './editor/d-settings/index.ts';
import { "f-platform-register" as registerPlatform } from './editor/f-platform/index.ts';

// Importing a feature does not register it. Startup order is this list.
registerToggleActions();
registerFile();
registerPlayer();
registerTimeline();
registerSegments();
registerStreams();
registerExport();
registerConcat();
registerEdl();
registerCapture();
registerDetect();
registerKeyboard();
registerSettings();
registerPlatform();

await initEditor();
initThemeSync();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);

mainApi.rendererReady();
