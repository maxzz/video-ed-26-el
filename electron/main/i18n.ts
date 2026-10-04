import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import i18n from 'i18next';
import { app } from 'electron';
import { mapLang, type ElectronLanguageKey } from '@shared/i18n.ts';
import logger from './logger.ts';

export const fallbackLng = 'en';

let customLocalesPath: string | undefined;

export function setCustomLocalesPath(p: string) {
    customLocalesPath = p;
}

function getLocalesDir() {
    if (customLocalesPath != null) {
        return customLocalesPath;
    }
    return app.isPackaged ? join(process.resourcesPath, 'locales') : join(app.getAppPath(), 'resources', 'locales');
}

function loadTranslationExact(lng: string): Record<string, string> | undefined {
    try {
        return JSON.parse(readFileSync(join(getLocalesDir(), mapLang(lng as ElectronLanguageKey), 'translation.json'), 'utf8'));
    } catch {
        return undefined;
    }
}

/** Falls back from a region code to the base language (`ru-RU` -> `ru`) */
function loadTranslation(lng: string) {
    if (lng === 'en' || lng.startsWith('en-')) {
        return undefined;
    }
    return loadTranslationExact(lng) ?? loadTranslationExact(lng.split('-')[0]!);
}

export async function initI18n(language: string | null) {
    const lng = language ?? app.getLocale();
    await i18n.init({
        lng,
        fallbackLng,
        keySeparator: false,
        nsSeparator: false,
        resources: {},
        interpolation: { escapeValue: false },
    });
    await changeLanguage(language);
}

export async function changeLanguage(language: string | null) {
    const lng = language ?? app.getLocale();
    const translation = loadTranslation(lng);
    if (translation) {
        i18n.addResourceBundle(lng, 'translation', translation, true, true);
    } else {
        logger.info('No translation for', lng);
    }
    await i18n.changeLanguage(lng);
}

export const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options);
