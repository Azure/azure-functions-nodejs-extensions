// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

export interface DiscoveredRoute {
    expressPath: string;
    azureFunctionsRoute: string;
    methods: string[];
    functionName: string;
}

/** Walk the Express router stack and return all registered routes. */
export function extractRoutes(expressApp: unknown, basePath = ''): DiscoveredRoute[] {
    const routes: DiscoveredRoute[] = [];
    const seen = new Set<string>();
    const stack = ((expressApp as Record<string, unknown>)?._router as Record<string, unknown>)?.stack;
    if (!Array.isArray(stack)) return routes;
    processStack(stack, basePath, routes, seen);
    return routes;
}

function processStack(stack: unknown[], prefix: string, routes: DiscoveredRoute[], seen: Set<string>): void {
    let idx = 0;
    while (idx < stack.length) {
        const layer = stack[idx] as Record<string, unknown>;
        idx++;
        const route = layer.route as Record<string, unknown> | undefined;
        const handle = layer.handle as Record<string, unknown> | undefined;

        if (route) {
            const methods = getMethods(route.methods as Record<string, boolean> | undefined);
            const fullPath = cleanPath(prefix + (route.path as string));
            const key = methods.sort().join(',') + ':' + fullPath;
            if (!seen.has(key)) {
                seen.add(key);
                routes.push({
                    expressPath: fullPath,
                    azureFunctionsRoute: expressPathToAzureRoute(fullPath),
                    methods,
                    functionName: generateFunctionName(fullPath, methods),
                });
            }
        } else if (handle && Array.isArray(handle.stack)) {
            const nestedPrefix = getPrefix(layer, layer.regexp as RegExp | undefined);
            processStack(handle.stack as unknown[], prefix + nestedPrefix, routes, seen);
        }
    }
}

function getPrefix(layer: Record<string, unknown>, regexp?: RegExp): string {
    if (typeof layer.path === 'string' && layer.path !== '/') return layer.path;
    if (regexp) {
        const m = regexp.source.match(/^\^\\?\/?([\w\-\/]*)/);
        if (m && m[1]) return '/' + m[1];
    }
    return '';
}

function getMethods(methods: Record<string, boolean> | undefined): string[] {
    if (!methods) return ['GET'];
    const result: string[] = [];
    const keys = Object.keys(methods);
    let i = 0;
    while (i < keys.length) {
        if (methods[keys[i]] && keys[i] !== '_all') result.push(keys[i].toUpperCase());
        i++;
    }
    return result;
}

/** Convert Express path params to Azure Functions route format. */
export function expressPathToAzureRoute(expressPath: string): string {
    let route = expressPath.startsWith('/') ? expressPath.substring(1) : expressPath;
    route = route.replace(/:(\w+)/g, '{$1}');
    route = route.replace(/\(\.\*\)/g, '{*path}');
    route = route.replace(/\*(\w*)/g, (_m: string, name: string) => '{*' + (name || 'path') + '}');
    return route;
}

/** Generate a unique Azure Function name from route + methods. */
export function generateFunctionName(expressPath: string, methods: string[]): string {
    let p = expressPath.replace(/^\/|\/$/g, '');
    p = p.replace(/:(\w+)/g, '$1');
    p = p.replace(/\//g, '-');
    p = p.replace(/\*/g, 'wildcard').replace(/\(\.\*\)/g, 'wildcard');
    p = p.replace(/[^a-zA-Z0-9-]/g, '');
    return methods.join('-') + '-' + p;
}

function cleanPath(p: string): string {
    let n = p.replace(/\/+/g, '/');
    if (!n.startsWith('/')) n = '/' + n;
    if (n.length > 1 && n.endsWith('/')) n = n.slice(0, -1);
    return n;
}
