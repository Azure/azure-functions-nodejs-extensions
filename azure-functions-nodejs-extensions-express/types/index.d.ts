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

/** Express server running inside the Azure Functions worker. */
export interface ExpressServer {
    readonly port: number;
    readonly isStarted: boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
}

/** A route discovered from an Express application. */
export interface DiscoveredRoute {
    expressPath: string;
    azureFunctionsRoute: string;
    methods: string[];
    functionName: string;
}

/**
 * Register an Express app as Azure Functions.
 *
 * Discovers all routes and creates one Azure Function per route.
 * Express runs as a real HTTP server with full streaming and middleware support.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { expressApp } from '@azure/functions-extensions-express';
 *
 * const app = express();
 * app.get('/items', (req, res) => res.json(items));
 * app.get('/items/:id', (req, res) => res.json(item));
 * expressApp('api', app);
 * ```
 */
export function expressApp(name: string, expressApp: ExpressApp, options?: ExpressFunctionOptions): ExpressServer;

/** Stops all Express servers. Call during app termination for graceful shutdown. */
export function stopAllServers(): Promise<void>;

/** Gets an Express server by name. */
export function getServer(name: string): ExpressServer | undefined;
