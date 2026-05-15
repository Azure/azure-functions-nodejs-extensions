// Copyright (c) Microsoft Corporation.  All rights reserved.

import { InvocationContext } from '@azure/functions';
import { connectors, EmailTriggerContext } from '@azure/functions-extensions-connectors';

connectors.office365.onNewEmail('OnNewEmail', {
    handler: async (context: EmailTriggerContext, invocationContext: InvocationContext) => {
        invocationContext.log('OnNewEmail trigger received.');

        // context.emails is typed as GraphClientReceiveMessage[] — full IntelliSense
        for (const email of context.emails) {
            invocationContext.log(`Subject: '${email.subject}'.`);
            invocationContext.log(`From: '${email.from}'.`);
            invocationContext.log(`Importance: '${email.importance}'.`);
            invocationContext.log(`Has attachments: '${email.hasAttachments}'.`);
        }

        // context.payload is a TriggerCallbackPayload<GraphClientReceiveMessage>
        // with normalised { body: { value: GraphClientReceiveMessage[] } } shape
        const batch = context.payload.body?.value ?? [];
        invocationContext.log(`Batch contains '${batch.length}' item(s).`);

        // rawPayload preserves the original payload for persistence or forwarding
        return context.rawPayload;
    },
});
