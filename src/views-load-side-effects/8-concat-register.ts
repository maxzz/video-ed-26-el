import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { concatBatch } from "@/editor/8-concat/7-actions/concat-actions";
import { initConcatEffects } from "@/editor/8-concat/7-actions/concat-effects";

export function register_8_concat() {
    initConcatEffects();
    registerActions({
        concatBatch,
    });
}
