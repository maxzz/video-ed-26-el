import { atom } from 'jotai';
import i18n from 'i18next';
import { DirectoryAccessDeclinedError, UnsupportedFileError } from '../8-lib/9-error-types.ts';
import { isAbortedError } from '../8-lib/util.ts';
import { abortFfmpegs } from '../8-lib/ffmpeg/ff-remote.ts';
import { jotaiDefaultStore } from '../../../utils/local-utils/9-jotai-default-store.ts';

// Port of upstream useLoading + useErrorHandling

export interface WorkingState {
    text: string;
    abortController?: AbortController | undefined;
}

export const workingAtom = atom<WorkingState | undefined>(undefined);

/** 0..1 or undefined when no operation with progress is running */
export const progressAtom = atom<number | undefined>(undefined);

//---------------------------------------------------------------------------

export function isWorking() {
    return jotaiDefaultStore.get(workingAtom) != null;
}

export function setWorking(valOrBool?: WorkingState | true | undefined) {
    jotaiDefaultStore.set(workingAtom, valOrBool === true ? { text: i18n.t('Loading') } : valOrBool);
}

export function setProgress(progress: number | undefined) {
    jotaiDefaultStore.set(progressAtom, progress);
}

export function abortWorking() {
    console.log('User clicked abort');
    abortFfmpegs();
    jotaiDefaultStore.get(workingAtom)?.abortController?.abort();
}

//---------------------------------------------------------------------------

export interface GenericError {
    title?: string | undefined;
    err?: unknown;
}

export const genericErrorAtom = atom<GenericError | undefined>(undefined);

export function handleError({ title, err }: GenericError) {
    console.error('handleError', title, err);
    jotaiDefaultStore.set(genericErrorAtom, { title, err });
}

//---------------------------------------------------------------------------

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
