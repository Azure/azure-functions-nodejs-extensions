// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext } from '@azure/functions';
import { connectors, FileTriggerContext } from '@azure/functions-extensions-connectors';

connectors.sharepoint.onNewFile('OnSharepointNewFile', {
    handler: async (context: FileTriggerContext, invocationContext: InvocationContext) => {
        invocationContext.log('OnSharepointNewFile trigger received.');

        // NOTE(swapnilnagar): context.files is typed as BlobMetadata[] from the SharePoint Online SDK.
        for (const file of context.files) {
            invocationContext.log(`Name: '${file.Name}'.`);
            invocationContext.log(`Path: '${file.Path}'.`);
            invocationContext.log(`Size: '${file.Size}'.`);
        }

        return context.rawPayload;
    },
});
