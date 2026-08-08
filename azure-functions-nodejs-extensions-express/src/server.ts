// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import * as http from 'http';
import { Readable } from 'stream';
import { ExpressApp, ExpressServer, SidecarOptions } from './types';

// --- Server registry ---

const registry = new Map<string, ExpressSidecarServer>();

export function getOrCreateServer(name: string, app: ExpressApp, opts: SidecarOptions): ExpressSidecarServer {
    let server = registry.get(name);
    if (!server) {
        server = new ExpressSidecarServer(app, opts);
        registry.set(name, server);
    }
    return server;
}

export function getServer(name: string): ExpressServer | undefined {
    return registry.get(name);
}

export async function stopAllServers(): Promise<void> {
    await Promise.all(Array.from(registry.values()).map((s) => s.stop()));
    registry.clear();
}

// --- Sidecar server ---

export class ExpressSidecarServer implements ExpressServer {
    readonly #app: ExpressApp;
    readonly #opts: SidecarOptions;
    #server: http.Server | null = null;
    #port = 0;
    #started = false;
    #starting: Promise<void> | null = null;

    constructor(app: ExpressApp, opts: SidecarOptions) {
        this.#app = app;
        this.#opts = opts;
    }

    get port(): number {
        return this.#port;
    }
    get isStarted(): boolean {
        return this.#started;
    }

    async start(): Promise<void> {
        if (this.#started) return;
        this.#starting ??= new Promise<void>((resolve, reject) => {
            this.#server = http.createServer(this.#app);
            this.#server.on('error', reject);
            this.#server.listen(this.#opts.port, '127.0.0.1', () => {
                const addr = this.#server?.address();
                if (addr && typeof addr !== 'string') this.#port = addr.port;
                this.#started = true;
                console.log(`[functions-express] Started on port ${this.#port}`);
                resolve();
            });
        });
        await this.#starting;
    }

    async stop(): Promise<void> {
        if (!this.#server || !this.#started) return;
        return new Promise<void>((resolve, reject) => {
            this.#server!.close((err) => {
                if (err) return reject(err);
                this.#started = false;
                this.#server = null;
                this.#starting = null;
                resolve();
            });
        });
    }

    /** Proxy a request to the Express server. Returns streaming or buffered body based on options. */
    async proxy(
        method: string,
        url: string,
        headers: Record<string, string>,
        body: Buffer | null,
        invocationId: string
    ): Promise<{ status: number; headers: Record<string, string>; body: Readable | Buffer | null }> {
        await this.start();

        // Strip basePath prefix
        let path = url;
        if (this.#opts.basePath) {
            const base = this.#opts.basePath.replace(/\/$/, '');
            if (path.startsWith(base)) path = path.slice(base.length) || '/';
        }

        return new Promise((resolve, reject) => {
            const req = http.request(
                {
                    hostname: '127.0.0.1',
                    port: this.#port,
                    path,
                    method,
                    headers: {
                        ...headers,
                        'x-forwarded-for': headers['x-forwarded-for'] || headers['x-azure-clientip'] || '',
                        'x-azure-functions-invocationid': invocationId,
                    },
                    timeout: this.#opts.timeout,
                },
                (res) => {
                    // Collect response headers
                    const h: Record<string, string> = {};
                    for (const [k, v] of Object.entries(res.headers)) {
                        if (v !== undefined) h[k] = Array.isArray(v) ? v.join(', ') : v;
                    }
                    delete h['connection'];
                    delete h['keep-alive'];
                    delete h['transfer-encoding'];

                    const status = res.statusCode || 200;

                    if (this.#opts.enableStreaming) {
                        resolve({ status, headers: h, body: res });
                    } else {
                        const chunks: Buffer[] = [];
                        res.on('data', (c: Buffer) => chunks.push(c));
                        res.on('end', () => resolve({ status, headers: h, body: Buffer.concat(chunks) }));
                        res.on('error', reject);
                    }
                }
            );

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Timeout after ${this.#opts.timeout}ms`));
            });
            body ? req.end(body) : req.end();
        });
    }
}
