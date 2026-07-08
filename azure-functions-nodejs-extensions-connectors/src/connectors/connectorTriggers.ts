// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { onUpdatedFile as onAzureBlobUpdatedFile } from './azureblobTriggers';
import { onQueryResult } from './kustoTriggers';
import {
    onFlaggedEmail,
    onNewCalendarEvent,
    onNewEmail,
    onNewMentionMeEmail,
    onUpcomingEvent,
} from './office365Triggers';
import {
    onNewFile as onOneDriveNewFile,
    onUpdatedFile as onOneDriveUpdatedFile,
} from './onedriveTriggers';
import { onNewFile, onUpdatedFile } from './sharepointTriggers';
import {
    onGroupMembershipAdd,
    onGroupMembershipRemoval,
    onNewChannelMessage,
    onNewChannelMessageMentioningMe,
} from './teamsTriggers';

/**
 * First-class connector trigger registrations grouped by connector.
 *
 * @example
 * ```typescript
 * import { connectors } from '@azure/functions-extensions-connectors';
 *
 * connectors.office365.onNewEmail('OnNewEmail', {
 *     handler: async (context, invocationContext) => {
 *         for (const email of context.items) {
 *             invocationContext.log(`Subject: '${email.subject}'.`);
 *         }
 *     },
 * });
 * ```
 */
export const connectors = {
    azureblob: {
        onUpdatedFile: onAzureBlobUpdatedFile,
    },
    kusto: {
        onQueryResult,
    },
    office365: {
        onFlaggedEmail,
        onNewCalendarEvent,
        onNewEmail,
        onNewMentionMeEmail,
        onUpcomingEvent,
    },
    onedrive: {
        onNewFile: onOneDriveNewFile,
        onUpdatedFile: onOneDriveUpdatedFile,
    },
    sharepoint: {
        onNewFile,
        onUpdatedFile,
    },
    teams: {
        onGroupMembershipAdd,
        onGroupMembershipRemoval,
        onNewChannelMessage,
        onNewChannelMessageMentioningMe,
    },
};
