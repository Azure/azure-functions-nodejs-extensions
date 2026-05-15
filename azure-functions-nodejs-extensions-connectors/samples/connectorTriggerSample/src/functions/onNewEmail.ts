// Copyright (c) Microsoft Corporation.  All rights reserved.

import { InvocationContext, output } from '@azure/functions';
import { connectors } from '@azure/functions-extensions-connectors';

connectors.office365.onNewEmail('OnNewEmail', {
    handler: async (triggerContext, invocationContext: InvocationContext) => {
        invocationContext.log('OnNewEmail trigger received.');

        // context.items is typed as GraphClientReceiveMessage[] — full IntelliSense
        for (const email of triggerContext.items) {
            invocationContext.log(`Subject: '${email.subject}'.`);
            invocationContext.log(`From: '${email.from}'.`);
            invocationContext.log(`Importance: '${email.importance}'.`);
            invocationContext.log(`Has attachments: '${email.hasAttachments}'.`);
        }

        // context.payload is a TriggerCallbackPayload<GraphClientReceiveMessage>
        // with normalised { body: { value: GraphClientReceiveMessage[] } } shape
        const batch = triggerContext.payload.body?.value ?? [];
        invocationContext.log(`Batch contains '${batch.length}' item(s).`);

        // rawPayload preserves the original payload for persistence or forwarding
        return triggerContext.rawPayload;
    },
});
