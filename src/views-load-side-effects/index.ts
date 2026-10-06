import { register_1_toggle_actions } from "./1-register_toggle_actions";
import { register_2_file } from "./2-file-register";
import { register_3_player } from "./3-player-register";
import { register_4_timeline } from "./4-timeline-register";
import { register_5_segments } from "./5-segments-register";
import { register_6_streams } from "./6-streams-register";
import { register_7_export } from "./7-export-register";
import { register_8_concat } from "./8-concat-register";
import { register_9_edl } from "./9-edl-register";
import { register_a_capture } from "./a-capture-register";
import { register_b_detect } from "./b-detect-register";
import { register_c_keyboard } from "./c-keyboard-register";
import { register_d_settings } from "./d-settings-register";
import { register_f_platform } from "./f-platform-register";

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
