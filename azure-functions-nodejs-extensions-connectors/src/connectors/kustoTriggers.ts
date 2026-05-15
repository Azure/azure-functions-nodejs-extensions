// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { Row } from '@azure/connectors/generated/KustoExtensions';
import { ConnectorTriggerOptions, QueryResultTriggerContext } from '../../types';
import { connectorTrigger } from './connectorTrigger';

/**
 * Registers a trigger that fires when a Kusto query returns new results.
 * The handler receives a typed context where `rows` is `Row[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onQueryResult(name: string, options: ConnectorTriggerOptions<Row, QueryResultTriggerContext>): void {
    connectorTrigger<Row>(name, {
        ...options,
        handler: async (context, invocationContext) => {
            const queryContext: QueryResultTriggerContext = {
                ...context,
                rows: context.items,
            };

            return options.handler(queryContext, invocationContext);
        },
    });
}
