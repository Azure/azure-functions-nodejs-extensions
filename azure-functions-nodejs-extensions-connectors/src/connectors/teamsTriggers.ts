// Copyright (c) Microsoft Corporation.  All rights reserved.

import { FunctionInput, FunctionOutput, InvocationContext } from '@azure/functions';
import { ChatMessage } from '@azure/connectors/generated/TeamsExtensions';
import { ConnectorTriggerContext } from '../../types';
import { connectorTrigger } from './connectorTrigger';

const CONNECTOR_NAME = 'teams';

/**
 * Options for registering a Teams channel message trigger.
 */
interface OnNewChannelMessageOptions {
    connection: string;
    extraInputs?: FunctionInput[];
    extraOutputs?: FunctionOutput[];
    return?: FunctionOutput;
    handler: (context: ConnectorTriggerContext<ChatMessage>, invocationContext: InvocationContext) => Promise<unknown>;
}

/**
 * Registers a trigger that fires when a new channel message is posted in Teams.
 * The handler receives a typed context where `items` is `ChatMessage[]`.
 * @param name The function name.
 * @param options The trigger options including connection and handler.
 */
export function onNewChannelMessage(name: string, options: OnNewChannelMessageOptions): void {
    connectorTrigger<ChatMessage>(name, {
        connection: options.connection,
        connector: CONNECTOR_NAME,
        triggerOperation: 'OnNewChannelMessage',
        extraInputs: options.extraInputs,
        extraOutputs: options.extraOutputs,
        return: options.return,
        handler: options.handler,
    });
}
