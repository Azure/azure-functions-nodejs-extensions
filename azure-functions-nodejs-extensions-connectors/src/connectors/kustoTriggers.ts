// Copyright (c) Microsoft Corporation.  All rights reserved.

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
        extraInputs: options.extraInputs,
        extraOutputs: options.extraOutputs,
        return: options.return,
        handler: async (context, invocationContext) => {
            const queryContext: QueryResultTriggerContext = {
                ...context,
                rows: context.items,
            };

            return options.handler(queryContext, invocationContext);
        },
    });
}
