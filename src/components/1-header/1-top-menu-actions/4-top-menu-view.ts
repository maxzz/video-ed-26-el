import { toggleSimpleMode as toggleSimpleModeSetting } from "@/editor/0-core/7-actions/settings-toggles";
import { tmcmd_view_toggleCommandPalette } from "@/editor/c-keyboard/7-actions/command-palette";

export function toggleCommandPalette() {
    tmcmd_view_toggleCommandPalette();
}

export function toggleSimpleMode() {
    toggleSimpleModeSetting();
}
