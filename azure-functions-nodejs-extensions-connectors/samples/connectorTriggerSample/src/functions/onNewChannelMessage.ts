// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext } from '@azure/functions';
import { ChannelMessageTriggerContext, connectors } from '@azure/functions-extensions-connectors';

connectors.teams.onNewChannelMessage('OnNewChannelMessage', {
    handler: async (context: ChannelMessageTriggerContext, invocationContext: InvocationContext) => {
        invocationContext.log('OnNewChannelMessage trigger received.');

        // NOTE(swapnilnagar): context.messages is typed as ChatMessage[] from the Teams SDK.
        // NOTE(swapnilnagar): `from` and `body` are typed as Record<string, unknown> — cast for property access.
        for (const message of context.messages) {
            const from = message.from as { user?: { displayName?: string } } | undefined;
            const body = message.body as { content?: string } | undefined;
            invocationContext.log(`Id: '${message.id}'.`);
            invocationContext.log(`From: '${from?.user?.displayName}'.`);
            invocationContext.log(`Content: '${body?.content}'.`);
        }

        return context.rawPayload;
    },
});
