import { atom } from 'jotai';
import i18n from 'i18next';
import { DirectoryAccessDeclinedError, UnsupportedFileError } from '../8-lib/errors.ts';
import { isAbortedError } from '../8-lib/util.ts';
import { abortFfmpegs } from '../8-lib/ffmpeg/ff-remote.ts';
import { appStore } from './store.ts';

// Port of upstream useLoading + useErrorHandling

export interface WorkingState {
    text: string;
    abortController?: AbortController | undefined;
}

export const workingAtom = atom<WorkingState | undefined>(undefined);

/** 0..1 or undefined when no operation with progress is running */
export const progressAtom = atom<number | undefined>(undefined);

export function isWorking() {
    return appStore.get(workingAtom) != null;
}

export function setWorking(valOrBool?: WorkingState | true | undefined) {
    appStore.set(workingAtom, valOrBool === true ? { text: i18n.t('Loading') } : valOrBool);
}

export function setProgress(progress: number | undefined) {
    appStore.set(progressAtom, progress);
}

export function abortWorking() {
    console.log('User clicked abort');
    abortFfmpegs();
    appStore.get(workingAtom)?.abortController?.abort();
}

export interface GenericError {
    title?: string | undefined;
    err?: unknown;
}

export const genericErrorAtom = atom<GenericError | undefined>(undefined);

export function handleError({ title, err }: GenericError) {
    console.error('handleError', title, err);
    appStore.set(genericErrorAtom, { title, err });
}

/** Run an operation with error handling */
export async function withErrorHandling(operation: () => Promise<void>, errorMsg?: string) {
    try {
        await operation();
    } catch (err) {
        if (err instanceof DirectoryAccessDeclinedError || isAbortedError(err)) return;

        if (err instanceof UnsupportedFileError) {
            console.error(err);
            handleError({ title: errorMsg, err: i18n.t('Unsupported file') });
            return;
        }

        handleError({ title: errorMsg, err });
    }
}

export type WithErrorHandling = typeof withErrorHandling;
export type SetWorking = typeof setWorking;
