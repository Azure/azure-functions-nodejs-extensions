// Copyright (c) Microsoft Corporation.  All rights reserved.

import { app, FunctionInput, FunctionOutput, InvocationContext } from '@azure/functions';
import { TriggerCallbackPayload } from '@azure/connectors';
import { ConnectorTriggerContext } from '../../types';

/**
 * Options for registering a connector trigger function.
 */
export interface ConnectorTriggerOptions<TItem = unknown> {
    /** The connection setting name (maps to an app setting with the connector runtime URL). */
    connection: string;

    /** The connector name (e.g., 'office365', 'sharepoint'). */
    connector: string;

    /** The trigger operation (e.g., 'OnNewEmail', 'OnNewFile'). */
    triggerOperation: string;

    /** Optional extra input bindings (e.g., blob storage, connector content). */
    extraInputs?: FunctionInput[];

    /** Optional extra output bindings (e.g., blob storage). */
    extraOutputs?: FunctionOutput[];

    /** Optional return output binding. */
    return?: FunctionOutput;

    /** The handler function that processes the trigger event. */
    handler: (context: ConnectorTriggerContext<TItem>, invocationContext: InvocationContext) => Promise<unknown>;
}

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
function buildContextFromRawPayload<TItem>(raw: unknown): ConnectorTriggerContext<TItem> {
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
}

/**
 * Registers a connector trigger function with the Azure Functions app.
 * This wraps `app.connectorTrigger` with a strongly typed context.
 *
 * The handler is resilient to both SDK binding mode (factory-produced ConnectorTriggerContext)
 * and raw mode (plain string / object delivered by the host).
 */
export function connectorTrigger<TItem = unknown>(name: string, options: ConnectorTriggerOptions<TItem>): void {
    app.connectorTrigger(name, {
        connection: options.connection,
        connector: options.connector,
        triggerOperation: options.triggerOperation,
        extraInputs: options.extraInputs,
        extraOutputs: options.extraOutputs,
        return: options.return,
        handler: async (triggerInput: unknown, invocationContext: InvocationContext): Promise<unknown> => {
            const context = buildContextFromRawPayload<TItem>(triggerInput);

            return options.handler(context, invocationContext);
        },
    });
}
