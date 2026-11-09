// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { app, InvocationContext } from '@azure/functions';
import { TriggerCallbackPayload } from '@azure/connectors';
import { ConnectorTriggerContext, ConnectorTriggerOptions } from '../../types';

export type { ConnectorTriggerOptions };

function getItemsFromEnvelope<TItem>(envelope: unknown): TItem[] {
    if (typeof envelope !== 'object' || envelope === null || !('body' in envelope)) {
        return [];
    }

    const body = envelope.body;
    if (typeof body !== 'object' || body === null) {
        return [];
    }

    if ('value' in body && Array.isArray(body.value)) {
        return body.value as TItem[];
    }

    return Object.keys(body).length > 0 ? [body as TItem] : [];
}

/**
 * Normalises a raw trigger payload (string or object) into a ConnectorTriggerContext.
 *
 * The Connector Gateway can deliver three payload formats:
 * 1. Batch format: `{ body: { value: [...items] } }` — standard TriggerCallbackPayload envelope.
 * 2. Single-item format: `{ body: { id, subject, ... } }` — body IS the item directly.
 * 3. Polling batch format: an array of either envelope format, flattened in delivery order.
 *
 * All are normalised into a `TriggerCallbackPayload<TItem>` with `body.value` as `TItem[]`,
 * so the customer always receives a strongly typed `payload` and `items` array.
 */
function buildContextFromRawPayload<TItem>(raw: unknown, invocationContext: InvocationContext): ConnectorTriggerContext<TItem> {
    let parsed: unknown = raw ?? {};
    if (typeof raw === 'string') {
        try {
            parsed = JSON.parse(raw);
            if (parsed === null) {
                throw new TypeError('Expected a connector trigger payload object or array.');
            }
        } catch (error) {
            invocationContext.warn(`Failed to parse connector trigger payload: '${error instanceof Error ? error.message : String(error)}'.`);
            parsed = raw;
        }
    }

    const items = Array.isArray(parsed)
        ? parsed.flatMap((envelope: unknown) => getItemsFromEnvelope<TItem>(envelope))
        : getItemsFromEnvelope<TItem>(parsed);
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
