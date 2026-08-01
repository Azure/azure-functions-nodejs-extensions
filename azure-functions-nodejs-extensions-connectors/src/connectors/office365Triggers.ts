// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { GraphCalendarEventClientReceive, GraphClientReceiveMessage } from '@azure/connectors/generated/Office365Extensions';
import { CalendarEventTriggerContext, ConnectorTriggerOptions, EmailTriggerContext } from '../../types';
import { connectorTrigger } from './connectorTrigger';

/**
 * Registers a trigger that fires when a new email arrives in Office 365.
 * The handler receives a typed context where `emails` is `GraphClientReceiveMessage[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onNewEmail(name: string, options: ConnectorTriggerOptions<GraphClientReceiveMessage, EmailTriggerContext>): void {
    connectorTrigger<GraphClientReceiveMessage>(name, {
        ...options,
        handler: async (context, invocationContext) => {
            const emailContext: EmailTriggerContext = {
                ...context,
                emails: context.items,
            };

            return options.handler(emailContext, invocationContext);
        },
    });
}

/**
 * Registers a trigger that fires when an email is flagged in Office 365.
 * The handler receives a typed context where `emails` is `GraphClientReceiveMessage[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onFlaggedEmail(name: string, options: ConnectorTriggerOptions<GraphClientReceiveMessage, EmailTriggerContext>): void {
    connectorTrigger<GraphClientReceiveMessage>(name, {
        ...options,
        handler: async (context, invocationContext) => {
            const emailContext: EmailTriggerContext = {
                ...context,
                emails: context.items,
            };

            return options.handler(emailContext, invocationContext);
        },
    });
}

/**
 * Registers a trigger that fires when a new email mentioning the signed-in user arrives in Office 365.
 * The handler receives a typed context where `emails` is `GraphClientReceiveMessage[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onNewMentionMeEmail(name: string, options: ConnectorTriggerOptions<GraphClientReceiveMessage, EmailTriggerContext>): void {
    connectorTrigger<GraphClientReceiveMessage>(name, {
        ...options,
        handler: async (context, invocationContext) => {
            const emailContext: EmailTriggerContext = {
                ...context,
                emails: context.items,
            };

            return options.handler(emailContext, invocationContext);
        },
    });
}

/**
 * Registers a trigger that fires when a new calendar event is created in Office 365.
 * The handler receives a typed context where `calendarEvents` is `GraphCalendarEventClientReceive[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onNewCalendarEvent(name: string, options: ConnectorTriggerOptions<GraphCalendarEventClientReceive, CalendarEventTriggerContext>): void {
    connectorTrigger<GraphCalendarEventClientReceive>(name, {
        ...options,
        handler: async (context, invocationContext) => {
            const calendarContext: CalendarEventTriggerContext = {
                ...context,
                calendarEvents: context.items,
            };

            return options.handler(calendarContext, invocationContext);
        },
    });
}

/**
 * Registers a trigger that fires for upcoming calendar events in Office 365.
 * The handler receives a typed context where `calendarEvents` is `GraphCalendarEventClientReceive[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onUpcomingEvent(name: string, options: ConnectorTriggerOptions<GraphCalendarEventClientReceive, CalendarEventTriggerContext>): void {
    connectorTrigger<GraphCalendarEventClientReceive>(name, {
        ...options,
        handler: async (context, invocationContext) => {
            const calendarContext: CalendarEventTriggerContext = {
                ...context,
                calendarEvents: context.items,
            };

            return options.handler(calendarContext, invocationContext);
        },
    });
}
