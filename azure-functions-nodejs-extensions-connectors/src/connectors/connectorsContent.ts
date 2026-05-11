// Copyright (c) Microsoft Corporation.  All rights reserved.

import { onNewEmail, onNewCalendarEvent } from './office365Triggers';
import { onNewFile, onUpdatedFile } from './sharepointTriggers';
import { onNewChannelMessage } from './teamsTriggers';
import { onQueryResult } from './kustoTriggers';

/**
 * First-class connector trigger registrations grouped by connector.
 *
 * @example
 * ```typescript
 * import { connectors } from '@azure/functions-extensions-connectors';
 *
 * connectors.office365.onNewEmail('OnNewEmail', {
 *     connection: 'Office365Connection',
 *     handler: async (context, invocationContext) => {
 *         for (const email of context.items) {
 *             invocationContext.log(`Subject: '${email.subject}'.`);
 *         }
 *     },
 * });
 * ```
 */
export const connectors = {
    office365: {
        onNewEmail,
        onNewCalendarEvent,
    },
    sharepoint: {
        onNewFile,
        onUpdatedFile,
    },
    teams: {
        onNewChannelMessage,
    },
    kusto: {
        onQueryResult,
    },
};
