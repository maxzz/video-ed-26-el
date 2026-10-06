import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { toggleSettings } from "@/components/2-main/0-all/a-panels-atoms";

export function register_d_settings() {
    registerActions({
        toggleSettings,
    });
}
