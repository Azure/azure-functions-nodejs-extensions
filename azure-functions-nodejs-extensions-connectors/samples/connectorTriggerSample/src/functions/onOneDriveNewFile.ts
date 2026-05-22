// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext } from '@azure/functions';
import { connectors, OneDriveFileTriggerContext } from '@azure/functions-extensions-connectors';

connectors.onedrive.onNewFile('OnOneDriveNewFile', {
    handler: async (context: OneDriveFileTriggerContext, invocationContext: InvocationContext) => {
        invocationContext.log('OnOneDriveNewFile trigger received.');

        // NOTE(swapnilnagar): context.files is typed as BlobMetadata[] from the OneDrive for Business SDK.
        for (const file of context.files) {
            invocationContext.log(`Name: '${file.Name}'.`);
            invocationContext.log(`Path: '${file.Path}'.`);
            invocationContext.log(`Size: '${file.Size}'.`);
        }

        return context.rawPayload;
    },
});
