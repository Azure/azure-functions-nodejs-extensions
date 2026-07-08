// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext } from '@azure/functions';
import { connectors, GroupMembershipTriggerContext } from '@azure/functions-extensions-connectors';

connectors.teams.onGroupMembershipRemoval('OnGroupMembershipRemoval', {
    handler: async (context: GroupMembershipTriggerContext, invocationContext: InvocationContext) => {
        invocationContext.log('OnGroupMembershipRemoval trigger received.');

        for (const member of context.members) {
            invocationContext.log(`Member: '${JSON.stringify(member)}'.`);
        }

        return context.rawPayload;
    },
});
