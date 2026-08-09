// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ChatMessage } from '@azure/connectors/generated/TeamsExtensions';
import {
    ChannelMessageTriggerContext,
    ConnectorTriggerOptions,
    GroupMembershipChange,
    GroupMembershipTriggerContext,
} from '../../types';
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

/**
 * Registers a trigger that fires when a new channel message mentioning the signed-in user is posted in Teams.
 * The handler receives a typed context where `messages` is `ChatMessage[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onNewChannelMessageMentioningMe(name: string, options: ConnectorTriggerOptions<ChatMessage, ChannelMessageTriggerContext>): void {
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

/**
 * Registers a trigger that fires when a member is added to a Teams group.
 * The handler receives a typed context where `members` is `Record<string, unknown>[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onGroupMembershipAdd(name: string, options: ConnectorTriggerOptions<GroupMembershipChange, GroupMembershipTriggerContext>): void {
    connectorTrigger<GroupMembershipChange>(name, {
        ...options,
        handler: async (context, invocationContext) => {
            const membershipContext: GroupMembershipTriggerContext = {
                ...context,
                members: context.items,
            };

            return options.handler(membershipContext, invocationContext);
        },
    });
}

/**
 * Registers a trigger that fires when a member is removed from a Teams group.
 * The handler receives a typed context where `members` is `Record<string, unknown>[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onGroupMembershipRemoval(name: string, options: ConnectorTriggerOptions<GroupMembershipChange, GroupMembershipTriggerContext>): void {
    connectorTrigger<GroupMembershipChange>(name, {
        ...options,
        handler: async (context, invocationContext) => {
            const membershipContext: GroupMembershipTriggerContext = {
                ...context,
                members: context.items,
            };

            return options.handler(membershipContext, invocationContext);
        },
    });
}
