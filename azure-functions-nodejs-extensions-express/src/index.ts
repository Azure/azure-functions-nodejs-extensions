// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

/**
 * @azure/functions-extensions-express — Express integration for Azure Functions.
 *
 * Runs Express as a real HTTP server inside the Functions worker.
 * Each Express route is automatically discovered and registered as
 * a separate Azure Function with full streaming and middleware support.
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

import { app, HttpHandler, HttpRequest, HttpResponse, InvocationContext } from '@azure/functions';
import { Readable } from 'stream';
import { extractRoutes } from './routeExtractor';
import { ExpressSidecarServer, getOrCreateServer } from './server';
import { ExpressApp, ExpressFunctionOptions, ExpressServer, SidecarOptions } from './types';

export { DiscoveredRoute } from './routeExtractor';
export { getServer, stopAllServers } from './server';
export { ExpressApp, ExpressFunctionOptions, ExpressServer } from './types';

const NULL_BODY_CODES = new Set([204, 304]);

// Enable HTTP streaming at the Azure Functions runtime level.
// Without this, the host serializes the entire response over gRPC
// and the browser receives everything at once instead of incrementally.
let httpStreamEnabled = false;
function ensureHttpStream(): void {
    if (!httpStreamEnabled) {
        app.setup({ enableHttpStream: true });
        httpStreamEnabled = true;
    }
}

function createHandler(sidecar: ExpressSidecarServer, opts: SidecarOptions): HttpHandler {
    return async (request: HttpRequest, context: InvocationContext) => {
        const url = new URL(request.url);
        let path = url.pathname + url.search;

        // Strip Azure Functions route prefix so Express sees its own paths
        if (opts.routePrefix && path.startsWith(opts.routePrefix)) {
            path = path.slice(opts.routePrefix.length) || '/';
            if (!path.startsWith('/')) path = '/' + path;
        }

        const headers: Record<string, string> = {};
        request.headers.forEach((v, k) => {
            headers[k] = v;
        });

        let body: Buffer | null = null;
        if (request.body) body = Buffer.from(await request.arrayBuffer());

        const res = await sidecar.proxy(request.method, path, headers, body, context.invocationId);
        const noBody = NULL_BODY_CODES.has(res.status) || (res.status >= 100 && res.status < 200);

        if (opts.enableStreaming && res.body instanceof Readable) {
            // Return an HttpResponse with enableContentNegotiation disabled
            // so the Azure Functions host streams the body incrementally.
            const httpRes = new HttpResponse({
                status: res.status,
                headers: res.headers,
                enableContentNegotiation: false,
                body: noBody ? undefined : res.body,
            });
            return httpRes;
        }

        return {
            status: res.status,
            headers: res.headers,
            body: noBody ? undefined : res.body ?? undefined,
        };
    };
}

/**
 * Register an Express app as Azure Functions.
 *
 * Discovers all routes and creates one Azure Function per route.
 * Falls back to a catch-all if no routes are found.
 */
export function expressApp(
    name: string,
    expressApplication: ExpressApp,
    options: ExpressFunctionOptions = {}
): ExpressServer {
    const routePrefix = options.routePrefix ?? '';
    const opts: SidecarOptions = {
        port: options.port ?? 0,
        basePath: options.basePath ?? '',
        timeout: options.timeout ?? 30000,
        enableStreaming: options.enableStreaming ?? true,
        routePrefix: routePrefix ? '/' + routePrefix.replace(/^\//, '') : '',
    };

    const sidecar = getOrCreateServer(name, expressApplication, opts);
    const handler = createHandler(sidecar, opts);
    const routes = extractRoutes(expressApplication, opts.basePath);

    // Enable HTTP streaming so the Functions host proxies responses
    // instead of buffering them over gRPC.
    if (opts.enableStreaming) {
        ensureHttpStream();
    }

    if (routes.length === 0) {
        console.warn('[functions-express] No routes found, using catch-all.');
        app.http(name, {
            route: options.route || '{*path}',
            methods: options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
            authLevel: options.authLevel || 'anonymous',
            handler,
        });
    } else {
        console.log(`[functions-express] Discovered ${routes.length} route(s):`);
        for (const r of routes) {
            const fn = `${name}-${r.functionName}`;
            console.log(`  ${fn} -> [${r.methods.join(', ')}] /${r.azureFunctionsRoute}`);
            app.http(fn, {
                route: r.azureFunctionsRoute,
                methods: r.methods as ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS')[],
                authLevel: options.authLevel || 'anonymous',
                handler,
            });
        }
    }

    return sidecar;
}
