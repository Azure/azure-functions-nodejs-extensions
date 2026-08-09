// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { BlobMetadata } from '@azure/connectors/generated/OnedriveforbusinessExtensions';
import { ConnectorTriggerOptions, OneDriveFileTriggerContext } from '../../types';
import { connectorTrigger } from './connectorTrigger';

/**
 * Registers a trigger that fires when a new file is created in OneDrive for Business.
 * The handler receives a typed context where `files` is `BlobMetadata[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onNewFile(name: string, options: ConnectorTriggerOptions<BlobMetadata, OneDriveFileTriggerContext>): void {
    connectorTrigger<BlobMetadata>(name, {
        ...options,
        handler: async (context, invocationContext) => {
            const fileContext: OneDriveFileTriggerContext = {
                ...context,
                files: context.items,
            };

            return options.handler(fileContext, invocationContext);
        },
    });
}

/**
 * Registers a trigger that fires when an existing file is modified in OneDrive for Business.
 * The handler receives a typed context where `files` is `BlobMetadata[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onUpdatedFile(name: string, options: ConnectorTriggerOptions<BlobMetadata, OneDriveFileTriggerContext>): void {
    connectorTrigger<BlobMetadata>(name, {
        ...options,
        handler: async (context, invocationContext) => {
            const fileContext: OneDriveFileTriggerContext = {
                ...context,
                files: context.items,
            };

            return options.handler(fileContext, invocationContext);
        },
    });
}
