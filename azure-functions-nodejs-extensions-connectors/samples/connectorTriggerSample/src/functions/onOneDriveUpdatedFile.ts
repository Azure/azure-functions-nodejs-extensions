// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext } from '@azure/functions';
import { connectors, OneDriveFileTriggerContext } from '@azure/functions-extensions-connectors';

connectors.onedrive.onUpdatedFile('OnOneDriveUpdatedFile', {
    handler: async (context: OneDriveFileTriggerContext, invocationContext: InvocationContext) => {
        invocationContext.log('OnOneDriveUpdatedFile trigger received.');

        for (const file of context.files) {
            invocationContext.log(`Name: '${file.Name}'.`);
            invocationContext.log(`Path: '${file.Path}'.`);
            invocationContext.log(`LastModified: '${file.LastModified}'.`);
        }

        return context.rawPayload;
    },
});
