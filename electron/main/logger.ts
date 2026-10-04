import { appendFileSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';
import util from 'node:util';
import { app } from 'electron';

const maxLogSize = 1e6;

export const logFilePath = join(app.isPackaged ? app.getPath('userData') : '.', 'app.log');

function rotateIfNeeded() {
    try {
        if (statSync(logFilePath).size > maxLogSize) {
            renameSync(logFilePath, `${logFilePath}.1`);
        }
    } catch {
        // no log file yet
    }
}

rotateIfNeeded();

function write(level: 'info' | 'warn' | 'error' | 'debug', args: unknown[]) {
    const line = `${new Date().toISOString()} ${level}: ${util.format(...args)}`;
    (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
    try {
        appendFileSync(logFilePath, `${line}\n`);
    } catch {
        // ignore file logging failures
    }
}

const logger = {
    info: (...args: unknown[]) => write('info', args),
    warn: (...args: unknown[]) => write('warn', args),
    error: (...args: unknown[]) => write('error', args),
    debug: (...args: unknown[]) => write('debug', args),
};

export default logger;
