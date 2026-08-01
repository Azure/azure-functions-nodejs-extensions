// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext } from '@azure/functions';
import { AzureBlobFileTriggerContext, connectors } from '@azure/functions-extensions-connectors';

connectors.azureblob.onUpdatedFile('OnAzureBlobUpdatedFile', {
    handler: async (context: AzureBlobFileTriggerContext, invocationContext: InvocationContext) => {
        invocationContext.log('OnAzureBlobUpdatedFile trigger received.');

        // NOTE(swapnilnagar): context.files is typed as BlobMetadata[] from the Azure Blob SDK.
        for (const file of context.files) {
            invocationContext.log(`Name: '${file.Name}'.`);
            invocationContext.log(`Path: '${file.Path}'.`);
            invocationContext.log(`Size: '${file.Size}'.`);
            invocationContext.log(`LastModified: '${file.LastModified}'.`);
        }

        invocationContext.log(`Batch contains '${context.items.length}' blob(s).`);
        return context.rawPayload;
    },
});
