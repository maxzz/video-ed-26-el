import { vi } from "vitest";
import i18n from "i18next";

// An uninitialized i18next returns undefined from t(), which breaks `error != null` style checks
await i18n.init({ lng: 'en', resources: {}, nsSeparator: false, keySeparator: false, interpolation: { escapeValue: false } });

// The real module reads window.mainApi (Electron preload) at import time
vi.mock('@/editor/0-core/7-actions/0-main-api.ts',
    () => import('./main-api-mock.ts')
);

// The real module evaluates in a Web Worker (`?worker` import), which node doesn't have
vi.mock('@/editor/0-core/8-lib/eval/eval.ts',
    () => ({
        default: async (code: string, context: Record<string, unknown>) => (
            Function(`\nwith (this) { return (${code}); }`).call(JSON.parse(JSON.stringify(context)))
        ),
    })
);
