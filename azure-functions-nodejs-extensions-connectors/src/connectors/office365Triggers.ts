// Copyright (c) Microsoft Corporation.  All rights reserved.

import { FunctionInput, FunctionOutput, InvocationContext } from '@azure/functions';
import { GraphClientReceiveMessage } from '@azure/connectors/generated/Office365Extensions';
import { GraphCalendarEventClientReceive } from '@azure/connectors/generated/Office365Extensions';
import { ConnectorTriggerContext } from '../../types';
import { connectorTrigger } from './connectorTrigger';

const CONNECTOR_NAME = 'office365';

/**
 * Options for registering an Office 365 email trigger.
 */
interface OnNewEmailOptions {
    connection: string;
    extraInputs?: FunctionInput[];
    extraOutputs?: FunctionOutput[];
    return?: FunctionOutput;
    handler: (context: ConnectorTriggerContext<GraphClientReceiveMessage>, invocationContext: InvocationContext) => Promise<unknown>;
}

/**
 * Options for registering an Office 365 calendar trigger.
 */
interface OnNewCalendarEventOptions {
    connection: string;
    extraInputs?: FunctionInput[];
    extraOutputs?: FunctionOutput[];
    return?: FunctionOutput;
    handler: (context: ConnectorTriggerContext<GraphCalendarEventClientReceive>, invocationContext: InvocationContext) => Promise<unknown>;
}

/**
 * Registers a trigger that fires when a new email arrives in Office 365.
 * The handler receives a typed context where `items` is `GraphClientReceiveMessage[]`.
 * @param name The function name.
 * @param options The trigger options including connection and handler.
 */
export function onNewEmail(name: string, options: OnNewEmailOptions): void {
    connectorTrigger<GraphClientReceiveMessage>(name, {
        connection: options.connection,
        connector: CONNECTOR_NAME,
        triggerOperation: 'OnNewEmail',
        extraInputs: options.extraInputs,
        extraOutputs: options.extraOutputs,
        return: options.return,
        handler: options.handler,
    });
}

/**
 * Registers a trigger that fires when a new calendar event is created in Office 365.
 * The handler receives a typed context where `items` is `GraphCalendarEventClientReceive[]`.
 * @param name The function name.
 * @param options The trigger options including connection and handler.
 */
export function onNewCalendarEvent(name: string, options: OnNewCalendarEventOptions): void {
    connectorTrigger<GraphCalendarEventClientReceive>(name, {
        connection: options.connection,
        connector: CONNECTOR_NAME,
        triggerOperation: 'CalendarGetOnNewItems',
        extraInputs: options.extraInputs,
        extraOutputs: options.extraOutputs,
        return: options.return,
        handler: options.handler,
    });
}
