// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import * as http from 'http';

/** Node.js HTTP request handler (Express, Koa, Fastify, etc.) */
export interface ExpressApp {
    (req: http.IncomingMessage, res: http.ServerResponse, next?: (err?: unknown) => void): void;
}

/** Options for registering an Express app with Azure Functions. */
export interface ExpressFunctionOptions {
    /** Fallback route pattern when no routes are discovered. @default '{*path}' */
    route?: string;
    /** HTTP methods to accept. @default all standard methods */
    methods?: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS')[];
    /** Authorization level. @default 'anonymous' */
    authLevel?: 'anonymous' | 'function' | 'admin';
    /** Base path prefix to strip before routing to Express. */
    basePath?: string;
    /** Port for the Express server (0 = auto). @default 0 */
    port?: number;
    /** Request timeout in ms. @default 30000 */
    timeout?: number;
    /** Enable streaming responses (SSE, large payloads). @default true */
    enableStreaming?: boolean;
    /** host.json routePrefix to strip from URLs. @default '' */
    routePrefix?: string;
}

/** Resolved internal options for the sidecar server. */
export interface SidecarOptions {
    port: number;
    basePath: string;
    timeout: number;
    enableStreaming: boolean;
    routePrefix: string;
}

/** Express server running inside the Azure Functions worker. */
export interface ExpressServer {
    readonly port: number;
    readonly isStarted: boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
}
