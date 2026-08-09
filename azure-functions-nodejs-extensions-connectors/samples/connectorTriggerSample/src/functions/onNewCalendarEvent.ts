// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext } from '@azure/functions';
import { CalendarEventTriggerContext, connectors } from '@azure/functions-extensions-connectors';

connectors.office365.onNewCalendarEvent('OnNewCalendarEvent', {
    handler: async (context: CalendarEventTriggerContext, invocationContext: InvocationContext) => {
        invocationContext.log('OnNewCalendarEvent trigger received.');

        // NOTE(swapnilnagar): context.calendarEvents is typed as GraphCalendarEventClientReceive[].
        for (const event of context.calendarEvents) {
            invocationContext.log(`Subject: '${event.subject}'.`);
            invocationContext.log(`Organizer: '${event.organizer}'.`);
            invocationContext.log(`Start: '${event.start}'.`);
            invocationContext.log(`End: '${event.end}'.`);
        }

        invocationContext.log(`Batch contains '${context.items.length}' event(s).`);
        return context.rawPayload;
    },
});
