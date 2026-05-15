// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ChatMessage } from '@azure/connectors/generated/TeamsExtensions';
import { TypedTriggerOptions } from '../../types';
import { connectorTrigger } from './connectorTrigger';

/**
 * Registers a trigger that fires when a new channel message is posted in Teams.
 * The handler receives a typed context where `items` is `ChatMessage[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onNewChannelMessage(name: string, options: TypedTriggerOptions<ChatMessage>): void {
    connectorTrigger<ChatMessage>(name, {
        extraInputs: options.extraInputs,
        extraOutputs: options.extraOutputs,
        return: options.return,
        handler: options.handler,
    });
}
