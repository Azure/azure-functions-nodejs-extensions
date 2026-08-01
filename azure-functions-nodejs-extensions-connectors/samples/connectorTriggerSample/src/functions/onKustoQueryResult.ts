// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext } from '@azure/functions';
import { connectors, QueryResultTriggerContext } from '@azure/functions-extensions-connectors';

connectors.kusto.onQueryResult('OnKustoQueryResult', {
    handler: async (context: QueryResultTriggerContext, invocationContext: InvocationContext) => {
        invocationContext.log('OnKustoQueryResult trigger received.');

        // NOTE(swapnilnagar): context.rows is typed as Row[] from the Kusto SDK.
        for (const row of context.rows) {
            invocationContext.log(`Row: '${JSON.stringify(row)}'.`);
        }

        invocationContext.log(`Batch contains '${context.items.length}' row(s).`);
        return context.rawPayload;
    },
});
