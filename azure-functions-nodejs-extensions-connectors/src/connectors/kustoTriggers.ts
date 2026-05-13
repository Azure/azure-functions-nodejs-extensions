// Copyright (c) Microsoft Corporation.  All rights reserved.

import { Row } from '@azure/connectors/generated/KustoExtensions';
import { TypedTriggerOptions } from '../../types';
import { connectorTrigger } from './connectorTrigger';

const CONNECTOR_NAME = 'kusto';

/**
 * Registers a trigger that fires when a Kusto query returns new results.
 * The handler receives a typed context where `items` is `Row[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including connection and handler.
 */
export function onQueryResult(name: string, options: TypedTriggerOptions<Row>): void {
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
