import { EventEmitter } from 'node:events';
import type { AppEvent } from '@shared/ipc-contract.ts';
import logger from './logger.ts';
import { emitToRenderer } from './events.ts';

let apiActionRequestsId = 0;
const apiActionRequests = new Map<number, () => void>();

/** Runs an action from the renderer's actions registry and resolves when the renderer reports it's done */
export async function sendApiAction(action: string, args?: unknown[]) {
    try {
        const id = apiActionRequestsId;
        apiActionRequestsId += 1;
        const done = new Promise<void>((resolve) => apiActionRequests.set(id, resolve));
        emitToRenderer('apiAction', { id, action, args });
        await done;
    } catch (err) {
        logger.error('sendApiAction', err);
    }
}

export function resolveApiAction(id: number) {
    apiActionRequests.get(id)?.();
    apiActionRequests.delete(id);
}

const appEvents = new EventEmitter();

export function emitAppEvent(event: AppEvent) {
    appEvents.emit('appEvent', event);
}

export async function awaitAppEvent(eventName: string, signal: AbortSignal) {
    return new Promise<AppEvent>((resolve, reject) => {
        const handler = (event: AppEvent) => {
            if (event.eventName === eventName) {
                appEvents.off('appEvent', handler);
                resolve(event);
            }
        };
        appEvents.on('appEvent', handler);
        signal.addEventListener('abort', () => {
            appEvents.off('appEvent', handler);
            reject(new Error('Aborted'));
        });
    });
}
