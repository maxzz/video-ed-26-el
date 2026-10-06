import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { mapLang, type ElectronLanguageKey } from "@shared/i18n";
import { mainApi } from "@/editor/0-core/7-actions/0-main-api";

// Translation keys are the English strings (like upstream), so English needs no resources.
const locales = import.meta.glob<{ default: Record<string, string>; }>('/resources/locales/*/translation.json');

const getLoaderExact = (lng: string) => locales[`/resources/locales/${mapLang(lng as ElectronLanguageKey)}/translation.json`];

/** Falls back from a region code to the base language (`ru-RU` -> `ru`), like i18next's backend lookup does */
function getLoader(lng: string) {
    return getLoaderExact(lng) ?? getLoaderExact(lng.split('-')[0]!);
}

async function loadLanguage(lng: string) {
    if (lng === 'en' || lng.startsWith('en-') || i18n.hasResourceBundle(lng, 'translation')) return;
    const loader = getLoader(lng);
    if (!loader) {
        console.warn('No translation for language', lng);
        return;
    }
    const { default: resources } = await loader();
    i18n.addResourceBundle(lng, 'translation', resources, true, true);
}

function detectLanguage() {
    return navigator.language || 'en';
}

/** Must be awaited before the first render */
export async function initI18n(language: string | null | undefined) {
    const lng = language ?? detectLanguage();
    await i18n
        .use(initReactI18next)
        .init({
            lng,
            fallbackLng: 'en',
            // keys are natural language: no namespace or key separators
            nsSeparator: false,
            keySeparator: false,
            returnEmptyString: false,
            interpolation: { escapeValue: false }, // react escapes
            resources: {},
        });
    await loadLanguage(lng);
    await i18n.changeLanguage(lng);
}

export async function changeLanguage(language: string | null | undefined) {
    const lng = language ?? detectLanguage();
    await loadLanguage(lng);
    await i18n.changeLanguage(lng);
    await mainApi.setLanguage(language ?? null);
}
