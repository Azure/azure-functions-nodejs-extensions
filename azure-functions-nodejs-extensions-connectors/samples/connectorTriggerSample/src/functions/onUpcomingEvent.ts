// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext } from '@azure/functions';
import { CalendarEventTriggerContext, connectors } from '@azure/functions-extensions-connectors';

connectors.office365.onUpcomingEvent('OnUpcomingEvent', {
    handler: async (context: CalendarEventTriggerContext, invocationContext: InvocationContext) => {
        invocationContext.log('OnUpcomingEvent trigger received.');

        for (const event of context.calendarEvents) {
            invocationContext.log(`Subject: '${event.subject}'.`);
            invocationContext.log(`Start: '${event.start}'.`);
        }

        return context.rawPayload;
    },
});
