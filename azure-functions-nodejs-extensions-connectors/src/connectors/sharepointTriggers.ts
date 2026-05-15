// Copyright (c) Microsoft Corporation.  All rights reserved.

import { BlobMetadata } from '@azure/connectors/generated/SharepointonlineExtensions';
import { ConnectorTriggerOptions, FileTriggerContext } from '../../types';
import { connectorTrigger } from './connectorTrigger';

/**
 * Registers a trigger that fires when a new file is created in SharePoint.
 * The handler receives a typed context where `files` is `BlobMetadata[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onNewFile(name: string, options: ConnectorTriggerOptions<BlobMetadata, FileTriggerContext>): void {
    connectorTrigger<BlobMetadata>(name, {
        extraInputs: options.extraInputs,
        extraOutputs: options.extraOutputs,
        return: options.return,
        handler: async (context, invocationContext) => {
            const fileContext: FileTriggerContext = {
                ...context,
                files: context.items,
            };

            return options.handler(fileContext, invocationContext);
        },
    });
}

/**
 * Registers a trigger that fires when an existing file is modified in SharePoint.
 * The handler receives a typed context where `files` is `BlobMetadata[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onUpdatedFile(name: string, options: ConnectorTriggerOptions<BlobMetadata, FileTriggerContext>): void {
    connectorTrigger<BlobMetadata>(name, {
        extraInputs: options.extraInputs,
        extraOutputs: options.extraOutputs,
        return: options.return,
        handler: async (context, invocationContext) => {
            const fileContext: FileTriggerContext = {
                ...context,
                files: context.items,
            };

            return options.handler(fileContext, invocationContext);
        },
    });
}
