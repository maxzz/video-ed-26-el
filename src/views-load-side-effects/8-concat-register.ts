import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { concatBatch } from '@/editor/8-concat/7-actions/concat-actions.ts';
import { initConcatEffects } from '@/editor/8-concat/7-actions/concat-effects.ts';

export function register_8_concat() {
    initConcatEffects();
    registerActions({
        concatBatch,
    });
}
