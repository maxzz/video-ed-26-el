import { onAppReady } from '@/editor/0-core/7-actions/lifecycle.ts';
import { initPlatform } from '@/editor/f-platform/7-actions/startup.ts';

function register() {
    onAppReady(initPlatform);
}

export { register as "f-platform-register" };
