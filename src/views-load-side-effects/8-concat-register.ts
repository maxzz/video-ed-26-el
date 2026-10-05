import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { concatBatch } from '@/editor/8-concat/7-actions/concat-actions.ts';
import { initConcatEffects } from '@/editor/8-concat/7-actions/concat-effects.ts';

function register() {
    initConcatEffects();
    registerActions({
        concatBatch,
    });
}

export { register as "8-concat-register" };
