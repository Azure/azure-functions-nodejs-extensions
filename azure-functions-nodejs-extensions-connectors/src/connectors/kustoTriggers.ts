// Copyright (c) Microsoft Corporation.  All rights reserved.

import { FunctionInput, FunctionOutput, InvocationContext } from '@azure/functions';
import { Row } from '@azure/connectors/generated/KustoExtensions';
import { ConnectorTriggerContext } from '../../types';
import { connectorTrigger } from './connectorTrigger';

const CONNECTOR_NAME = 'kusto';

/**
 * Options for registering a Kusto query result trigger.
 */
interface OnQueryResultOptions {
    connection: string;
    extraInputs?: FunctionInput[];
    extraOutputs?: FunctionOutput[];
    return?: FunctionOutput;
    handler: (context: ConnectorTriggerContext<Row>, invocationContext: InvocationContext) => Promise<unknown>;
}

/**
 * Registers a trigger that fires when a Kusto query returns new results.
 * The handler receives a typed context where `items` is `Row[]`.
 * @param name The function name.
 * @param options The trigger options including connection and handler.
 */
export function onQueryResult(name: string, options: OnQueryResultOptions): void {
    connectorTrigger<Row>(name, {
        connection: options.connection,
        connector: CONNECTOR_NAME,
        triggerOperation: 'OnQueryResult',
        extraInputs: options.extraInputs,
        extraOutputs: options.extraOutputs,
        return: options.return,
        handler: options.handler,
    });
}
