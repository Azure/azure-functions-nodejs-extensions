// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ChatMessage } from '@azure/connectors/generated/TeamsExtensions';
import { ChannelMessageTriggerContext, ConnectorTriggerOptions } from '../../types';
import { connectorTrigger } from './connectorTrigger';

/**
 * Registers a trigger that fires when a new channel message is posted in Teams.
 * The handler receives a typed context where `messages` is `ChatMessage[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onNewChannelMessage(name: string, options: ConnectorTriggerOptions<ChatMessage, ChannelMessageTriggerContext>): void {
    connectorTrigger<ChatMessage>(name, {
        ...options,
        handler: async (context, invocationContext) => {
            const messageContext: ChannelMessageTriggerContext = {
                ...context,
                messages: context.items,
            };

            return options.handler(messageContext, invocationContext);
        },
    });
}
