import { registerToggleActions } from './registerToggleActions.ts';
import { "2-file-register" as registerFile } from './2-file-register.ts';
import { "3-player-register" as registerPlayer } from './3-player-register.ts';
import { "4-timeline-register" as registerTimeline } from './4-timeline-register.ts';
import { "5-segments-register" as registerSegments } from './5-segments-register.ts';
import { "6-streams-register" as registerStreams } from './6-streams-register.ts';
import { "7-export-register" as registerExport } from './7-export-register.ts';
import { "8-concat-register" as registerConcat } from './8-concat-register.ts';
import { "9-edl-register" as registerEdl } from './9-edl-register.ts';
import { "a-capture-register" as registerCapture } from './a-capture-register.ts';
import { "b-detect-register" as registerDetect } from './b-detect-register.ts';
import { "c-keyboard-register" as registerKeyboard } from './c-keyboard-register.ts';
import { "d-settings-register" as registerSettings } from './d-settings-register.ts';
import { "f-platform-register" as registerPlatform } from './f-platform-register.ts';

/** Registers every feature. Importing a feature module does not do this. */
export function loadViewSideEffects() {
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
}
