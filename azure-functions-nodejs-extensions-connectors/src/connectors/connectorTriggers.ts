// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ConnectorTriggers } from '../../types';
import * as dataflows from './dataflowsTriggers';
import { onQueryResult } from './kustoTriggers';
import * as office365 from './office365Triggers';
import * as onedriveforbusiness from './oneDriveForBusinessTriggers';
import * as planner from './plannerTriggers';
import * as salesforce from './salesforceTriggers';
import * as sharepoint from './sharePointOnlineTriggers';
import * as teams from './teamsTriggers';
import * as vsts from './visualStudioTeamServicesTriggers';

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
    dataflows,
    kusto: {
        onQueryResult,
    },
    office365,
    onedriveforbusiness,
    planner,
    salesforce,
    sharepoint,
    teams,
    vsts,
} satisfies ConnectorTriggers;
