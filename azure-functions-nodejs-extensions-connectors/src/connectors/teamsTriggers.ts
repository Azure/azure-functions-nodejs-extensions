// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ChatMessage } from '@azure/connectors/generated/TeamsExtensions';
import { TypedTriggerOptions } from '../../types';
import { connectorTrigger } from './connectorTrigger';

const CONNECTOR_NAME = 'teams';

/**
 * Registers a trigger that fires when a new channel message is posted in Teams.
 * The handler receives a typed context where `items` is `ChatMessage[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including connection and handler.
 */
export function onNewChannelMessage(name: string, options: TypedTriggerOptions<ChatMessage>): void {
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
