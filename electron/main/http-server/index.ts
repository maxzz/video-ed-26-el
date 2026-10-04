import http from 'node:http';
import assert from 'node:assert';
import express from 'express';
import { homepageUrl } from '@shared/constants.ts';
import type { AppEvent } from '@shared/ipc-contract.ts';
import logger from '../logger.ts';
import { isRequestAllowed } from './http-server-util.ts';

export function createHttpServer({ port, onKeyboardAction, onAwaitAppEvent }: {
    port: number;
    onKeyboardAction: (action: string, args: unknown[]) => Promise<void>;
    onAwaitAppEvent: (eventName: string, signal: AbortSignal) => Promise<AppEvent>;
}) {
    const app = express();

    app.use((req, res, next) => {
        const started = Date.now();
        res.on('finish', () => logger.info(`${req.ip} ${req.method} ${req.url} ${res.statusCode} - ${Date.now() - started} ms`));
        next();
    });

    app.use((req, res, next) => {
        const { host, origin } = req.headers;
        if (!isRequestAllowed({ host, origin, port })) {
            logger.warn('Rejecting HTTP API request', { host, origin });
            res.status(403).send('Forbidden: the HTTP API can only be called by programs running on this computer, not from a web browser.');
            return;
        }
        next();
    });

    const apiRouter = express.Router();

    app.get('/', (_req, res) => res.send(`See ${homepageUrl}`));
    app.use('/api', apiRouter);

    apiRouter.post('/action/:action', express.json(), async (req, res) => {
        const { action } = req.params;
        assert(action != null);
        await onKeyboardAction(action, [req.body as unknown]);
        res.end();
    });

    apiRouter.post('/await-event/:eventName', express.json(), async (req, res) => {
        const { eventName } = req.params;
        assert(eventName != null);
        const abortController = new AbortController();
        req.on('close', () => abortController.abort());
        res.json(await onAwaitAppEvent(eventName, abortController.signal));
    });

    const server = http.createServer(app);
    server.on('error', (err) => logger.error('http server error', err));

    const startHttpServer = async () => new Promise<void>((resolve, reject) => {
        const host = '127.0.0.1'; // force ipv4
        server.listen(port, host, () => {
            logger.info('HTTP API listening on', `http://${host}:${port}/`);
            resolve();
        });
        server.once('error', reject);
    });

    return { startHttpServer };
}
