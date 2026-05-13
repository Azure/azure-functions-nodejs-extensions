// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ModelBindingData } from '@azure/functions-extensions-base';
import { TriggerCallbackPayload } from '@azure/connectors';
import { ConnectorTriggerContext } from '../../types';

export class ConnectorTriggerContextFactory {
    /**
     * Builds a ConnectorTriggerContext from the model binding data delivered by the Functions host.
     */
    public static buildFromModelBindingData(
        modelBindingData: ModelBindingData | ModelBindingData[]
    ): ConnectorTriggerContext {
        const data = Array.isArray(modelBindingData)
            ? modelBindingData[0]
            : modelBindingData;

        if (!data) {
            return ConnectorTriggerContextFactory.createEmptyContext();
        }

        const payload = ConnectorTriggerContextFactory.parsePayload(data);

        return {
            payload,
            items: payload.body?.value ?? [],
            rawPayload: payload,
            toJSON(): string {
                return JSON.stringify(payload);
            },
        };
    }

    private static parsePayload(data: ModelBindingData): TriggerCallbackPayload<unknown> {
        try {
            const content = data.content;

            if (typeof content === 'string') {
                return JSON.parse(content) as TriggerCallbackPayload<unknown>;
            }

            if (content instanceof Uint8Array || Buffer.isBuffer(content)) {
                const text = Buffer.from(content).toString('utf-8');
                return JSON.parse(text) as TriggerCallbackPayload<unknown>;
            }

            // NOTE(swapnilnagar): If content is already an object, treat it as the payload directly.
            if (typeof content === 'object' && content !== null) {
                return content as TriggerCallbackPayload<unknown>;
            }

            return {};
        } catch {
            return {};
        }
    }

    private static createEmptyContext(): ConnectorTriggerContext {
        const emptyPayload = {};
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
