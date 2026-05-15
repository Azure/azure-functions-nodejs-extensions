// Copyright (c) Microsoft Corporation.  All rights reserved.

import { GraphCalendarEventClientReceive, GraphClientReceiveMessage } from '@azure/connectors/generated/Office365Extensions';
import { ConnectorTriggerOptions } from '../../types';
import { connectorTrigger } from './connectorTrigger';

/**
 * Registers a trigger that fires when a new email arrives in Office 365.
 * The handler receives a typed context where `items` is `GraphClientReceiveMessage[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onNewEmail(name: string, options: ConnectorTriggerOptions<GraphClientReceiveMessage>): void {
    connectorTrigger<GraphClientReceiveMessage>(name, {
        extraInputs: options.extraInputs,
        extraOutputs: options.extraOutputs,
        return: options.return,
        handler: options.handler,
    });
}

/**
 * Registers a trigger that fires when a new calendar event is created in Office 365.
 * The handler receives a typed context where `items` is `GraphCalendarEventClientReceive[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onNewCalendarEvent(name: string, options: ConnectorTriggerOptions<GraphCalendarEventClientReceive>): void {
    connectorTrigger<GraphCalendarEventClientReceive>(name, {
        extraInputs: options.extraInputs,
        extraOutputs: options.extraOutputs,
        return: options.return,
        handler: options.handler,
    });
}
