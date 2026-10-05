import { register_1_toggle_actions } from './1-register_toggle_actions.ts';
import { register_2_file } from './2-file-register.ts';
import { register_3_player } from './3-player-register.ts';
import { register_4_timeline } from './4-timeline-register.ts';
import { register_5_segments } from './5-segments-register.ts';
import { register_6_streams } from './6-streams-register.ts';
import { register_7_export } from './7-export-register.ts';
import { register_8_concat } from './8-concat-register.ts';
import { register_9_edl } from './9-edl-register.ts';
import { register_a_capture } from './a-capture-register.ts';
import { register_b_detect } from './b-detect-register.ts';
import { register_c_keyboard } from './c-keyboard-register.ts';
import { register_d_settings } from './d-settings-register.ts';
import { register_f_platform } from './f-platform-register.ts';

export function loadViewsSideEffects() {
    register_1_toggle_actions();
    register_2_file();
    register_3_player();
    register_4_timeline();
    register_5_segments();
    register_6_streams();
    register_7_export();
    register_8_concat();
    register_9_edl();
    register_a_capture();
    register_b_detect();
    register_c_keyboard();
    register_d_settings();
    register_f_platform();
}
