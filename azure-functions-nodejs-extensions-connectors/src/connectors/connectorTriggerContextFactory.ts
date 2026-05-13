// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ModelBindingData } from '@azure/functions-extensions-base';
import { TriggerCallbackPayload } from '@azure/connectors';
import { ConnectorTriggerContext } from '../../types';

/**
 * Factory that transforms raw {@link ModelBindingData} from the Functions host
 * into a strongly-typed {@link ConnectorTriggerContext}.
 */
export class ConnectorTriggerContextFactory {
    /**
     * Builds a {@link ConnectorTriggerContext} from the model binding data delivered by the Functions host.
     * @param modelBindingData - The raw binding data (single or array) provided by the host.
     */
    public static buildFromModelBindingData<TItem = unknown>(
        modelBindingData: ModelBindingData | ModelBindingData[]
    ): ConnectorTriggerContext<TItem> {
        const data = Array.isArray(modelBindingData)
            ? modelBindingData[0]
            : modelBindingData;

        if (!data) {
            return ConnectorTriggerContextFactory.createEmptyContext<TItem>();
        }

        const payload = ConnectorTriggerContextFactory.parsePayload<TItem>(data);

        return {
            payload,
            items: payload.body?.value ?? [],
            rawPayload: payload,
            toJSON(): string {
                return JSON.stringify(payload);
            },
        };
    }

    /**
     * Parses the content of a {@link ModelBindingData} into a {@link TriggerCallbackPayload}.
     * Handles string, Buffer, Uint8Array, and pre-parsed object content.
     * @param data - The model binding data whose content should be parsed.
     */
    private static parsePayload<TItem = unknown>(data: ModelBindingData): TriggerCallbackPayload<TItem> {
        try {
            const content = data.content;

            if (typeof content === 'string') {
                return JSON.parse(content) as TriggerCallbackPayload<TItem>;
            }

            if (content instanceof Uint8Array || Buffer.isBuffer(content)) {
                const text = Buffer.from(content).toString('utf-8');
                return JSON.parse(text) as TriggerCallbackPayload<TItem>;
            }

            // NOTE(swapnilnagar): If content is already an object, treat it as the payload directly.
            if (typeof content === 'object' && content !== null) {
                return content as TriggerCallbackPayload<TItem>;
            }

            return { body: { value: [] } } as TriggerCallbackPayload<TItem>;
        } catch {
            return { body: { value: [] } } as TriggerCallbackPayload<TItem>;
        }
    }

    /**
     * Creates an empty {@link ConnectorTriggerContext} with no items.
     */
    private static createEmptyContext<TItem = unknown>(): ConnectorTriggerContext<TItem> {
        const emptyPayload: TriggerCallbackPayload<TItem> = { body: { value: [] } };
        return {
            payload: emptyPayload,
            items: [],
            rawPayload: emptyPayload,
            toJSON(): string {
                return JSON.stringify(emptyPayload);
            },
        };
    }
}
