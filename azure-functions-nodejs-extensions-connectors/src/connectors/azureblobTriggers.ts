// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { BlobMetadata } from '@azure/connectors/generated/AzureblobExtensions';
import { AzureBlobFileTriggerContext, ConnectorTriggerOptions } from '../../types';
import { connectorTrigger } from './connectorTrigger';

/**
 * Registers a trigger that fires when one or more blobs are added or modified in an Azure Blob container.
 * The handler receives a typed context where `files` is `BlobMetadata[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onUpdatedFile(name: string, options: ConnectorTriggerOptions<BlobMetadata, AzureBlobFileTriggerContext>): void {
    connectorTrigger<BlobMetadata>(name, {
        ...options,
        handler: async (context, invocationContext) => {
            const fileContext: AzureBlobFileTriggerContext = {
                ...context,
                files: context.items,
            };

            return options.handler(fileContext, invocationContext);
        },
    });
}
