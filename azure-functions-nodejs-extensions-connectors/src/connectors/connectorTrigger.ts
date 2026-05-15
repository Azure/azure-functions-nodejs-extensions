// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { app, InvocationContext } from '@azure/functions';
import { TriggerCallbackPayload } from '@azure/connectors';
import { ConnectorTriggerContext, ConnectorTriggerOptions } from '../../types';

export type { ConnectorTriggerOptions };

/**
 * Normalises a raw trigger payload (string or object) into a ConnectorTriggerContext.
 *
 * The Connector Gateway can deliver two payload formats:
 * 1. Batch format: `{ body: { value: [...items] } }` — standard TriggerCallbackPayload envelope.
 * 2. Single-item format: `{ body: { id, subject, ... } }` — body IS the item directly.
 *
 * Both are normalised into a `TriggerCallbackPayload<TItem>` with `body.value` as `TItem[]`,
 * so the customer always receives a strongly typed `payload` and `items` array.
 */
function buildContextFromRawPayload<TItem>(raw: unknown, invocationContext: InvocationContext): ConnectorTriggerContext<TItem> {
    try {
        const parsed = typeof raw === 'string'
            ? JSON.parse(raw) as Record<string, unknown>
            : (raw ?? {}) as Record<string, unknown>;

        const body = parsed.body as Record<string, unknown> | undefined;

        let items: TItem[];

        if (body !== undefined && body !== null && Array.isArray(body.value)) {
            // NOTE(swapnilnagar): Batch format — body.value is already the items array.
            items = body.value as TItem[];
        } else if (body !== undefined && body !== null && typeof body === 'object' && Object.keys(body).length > 0) {
            // NOTE(swapnilnagar): Single-item format — body IS the item directly.
            items = [body as unknown as TItem];
        } else {
            items = [];
        }

        // NOTE(swapnilnagar): Normalise into TriggerCallbackPayload<TItem> so
        // context.payload always has the { body: { value: TItem[] } } shape.
        const payload: TriggerCallbackPayload<TItem> = {
            body: { value: items },
        };

        return {
            payload,
            items,
            rawPayload: parsed,
            toJSON(): string {
                return JSON.stringify(parsed);
            },
        };
    } catch (error) {
        // NOTE(swapnilnagar): If the payload is malformed JSON or otherwise unparseable,
        // log a warning and return an empty context so the handler still runs gracefully.
        invocationContext.warn(`Failed to parse connector trigger payload: '${error instanceof Error ? error.message : String(error)}'.`);
        const emptyPayload: TriggerCallbackPayload<TItem> = { body: { value: [] } };
        return {
            payload: emptyPayload,
            items: [],
            rawPayload: raw,
            toJSON(): string {
                return JSON.stringify(raw);
            },
        };
    }
}

/**
 * Registers a connector trigger function with the Azure Functions app.
 *
 * This wraps {@link app.connectorTrigger} with a strongly-typed {@link ConnectorTriggerContext}
 * that normalises the raw host payload into a consistent `items` array.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger configuration including handler and optional bindings.
 */
export function connectorTrigger<TItem = unknown>(name: string, options: ConnectorTriggerOptions<TItem>): void {
    app.connectorTrigger(name, {
        ...options,
        handler: async (triggerInput: unknown, invocationContext: InvocationContext): Promise<unknown> => {
            const context = buildContextFromRawPayload<TItem>(triggerInput, invocationContext);

            return options.handler(context, invocationContext);
        },
    });
}
