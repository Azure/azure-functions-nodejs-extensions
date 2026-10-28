// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { GraphCalendarEventClientReceive, GraphCalendarEventClientWithActionType, GraphClientReceiveMessage } from '@azure/connectors/generated/Office365Extensions';
import { CalendarChangedEventTriggerContext, CalendarEventTriggerContext, ConnectorTriggerOptions, EmailTriggerContext } from '../../types';
import { connectorTrigger } from './connectorTrigger';
import { createConnectorTrigger } from './createConnectorTrigger';

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
 * Registers calendar changes, including the SDK action type.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onCalendarChangedItems = createConnectorTrigger<GraphCalendarEventClientWithActionType, CalendarChangedEventTriggerContext>(
    (context) => ({ ...context, calendarEvents: context.items }),
);

/**
 * Registers new calendar events. Alias for onNewCalendarEvent.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onCalendarNewItems = onNewCalendarEvent;

/**
 * Registers updated calendar events.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onCalendarUpdatedItems = onNewCalendarEvent;

/**
 * Registers flagged emails.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onFlaggedEmail = onNewEmail;

/**
 * Registers emails mentioning the current user.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onNewEmailMentioningMe = onNewEmail;

/**
 * Registers new shared mailbox emails.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onSharedMailboxNewEmail = onNewEmail;

/**
 * Registers upcoming calendar events.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onUpcomingEvents = onNewCalendarEvent;
