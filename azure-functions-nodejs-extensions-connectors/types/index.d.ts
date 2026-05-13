// Copyright (c) Microsoft Corporation.  All rights reserved.

import { TriggerCallbackPayload } from '@azure/connectors';
import { FunctionInput, FunctionOutput, InvocationContext } from '@azure/functions';

// ---------------------------------------------------------------------------
// Re-export connector SDK types used as trigger items.
// Customers can import these directly from this package.
// ---------------------------------------------------------------------------

export { GraphClientReceiveMessage, GraphCalendarEventClientReceive } from '@azure/connectors/generated/Office365Extensions';
export { BlobMetadata } from '@azure/connectors/generated/SharepointonlineExtensions';
export { ChatMessage } from '@azure/connectors/generated/TeamsExtensions';
export { Row as KustoRow } from '@azure/connectors/generated/KustoExtensions';
export { TriggerCallbackPayload, TriggerCallbackBody } from '@azure/connectors';

// ---------------------------------------------------------------------------
// Core trigger context
// ---------------------------------------------------------------------------

/**
 * Context object delivered to connector trigger handlers.
 * Wraps the AI Gateway trigger callback payload with typed access to items.
 */
export interface ConnectorTriggerContext<TItem = unknown> {
    /** The full trigger callback payload envelope. */
    payload: TriggerCallbackPayload<TItem>;

    /** The items delivered by the connector trigger (convenience accessor for payload.body.value). */
    items: TItem[];

    /**
     * The original payload object as received from the host (before envelope extraction).
     * Use this when you need to persist the full trigger data (e.g., to blob storage).
     */
    rawPayload: unknown;

    /**
     * Serialises the full trigger payload to a JSON string.
     * Convenience method for output bindings.
     */
    toJSON(): string;
}

/**
 * Handler function for a connector trigger.
 * Return a value to send it to the `return` output binding.
 */
export type ConnectorTriggerHandler<TItem = unknown> = (
    context: ConnectorTriggerContext<TItem>,
    invocationContext: InvocationContext,
) => Promise<unknown>;

/**
 * Options for registering a typed connector trigger.
 */
export interface TypedTriggerOptions<TItem> {
    /** The connection setting name (maps to an app setting with the connector runtime URL). */
    connection: string;

    /** Optional extra input bindings (e.g., blob storage, connector content). */
    extraInputs?: FunctionInput[];

    /** Optional extra output bindings (e.g., blob storage). */
    extraOutputs?: FunctionOutput[];

    /** Optional return output binding. */
    return?: FunctionOutput;

    /** The handler function that processes the trigger event. */
    handler: ConnectorTriggerHandler<TItem>;
}

// ---------------------------------------------------------------------------
// Connector content bindings
// ---------------------------------------------------------------------------

/**
 * Options for creating a connector content input binding.
 */
export interface ConnectorContentInputOptions {
    /** The connector name (e.g., 'office365', 'sharepointonline', 'teams', 'kusto'). */
    connector: string;

    /** The connection setting name. */
    connection: string;

    /** The operation to invoke on the connector (e.g., 'GetEmail', 'GetFile'). */
    operation?: string;
}

/**
 * Options for creating a connector content output binding.
 */
export interface ConnectorContentOutputOptions {
    /** The connector name (e.g., 'office365', 'sharepointonline', 'teams', 'kusto'). */
    connector: string;

    /** The connection setting name. */
    connection: string;

    /** The operation to invoke on the connector (e.g., 'SendEmail', 'CreateFile'). */
    operation?: string;
}

/**
 * Connector content bindings for input and output.
 */
export interface ConnectorContentBindings {
    /** Creates a connector content input binding for use with `extraInputs`. */
    input(options: ConnectorContentInputOptions): FunctionInput;

    /** Creates a connector content output binding for use with `extraOutputs` or `return`. */
    output(options: ConnectorContentOutputOptions): FunctionOutput;
}

/**
 * Connector content bindings for input and output.
 *
 * @example
 * ```typescript
 * import { connectorContent } from '@azure/functions-extensions-connectors';
 *
 * const emailInput = connectorContent.input({
 *     connector: 'office365',
 *     connection: 'Office365Connection',
 * });
 * ```
 */
export const connectorContent: ConnectorContentBindings;

// ---------------------------------------------------------------------------
// Connector-specific trigger registrations
// ---------------------------------------------------------------------------

import { GraphClientReceiveMessage, GraphCalendarEventClientReceive } from '@azure/connectors/generated/Office365Extensions';
import { BlobMetadata } from '@azure/connectors/generated/SharepointonlineExtensions';
import { ChatMessage } from '@azure/connectors/generated/TeamsExtensions';
import { Row } from '@azure/connectors/generated/KustoExtensions';

/**
 * Office 365 connector trigger registrations.
 */
export interface Office365Triggers {
    /** Registers a trigger that fires when a new email arrives. Handler items are typed as `GraphClientReceiveMessage[]`. */
    onNewEmail(name: string, options: TypedTriggerOptions<GraphClientReceiveMessage>): void;

    /** Registers a trigger that fires when a new calendar event is created. Handler items are typed as `GraphCalendarEventClientReceive[]`. */
    onNewCalendarEvent(name: string, options: TypedTriggerOptions<GraphCalendarEventClientReceive>): void;
}

/**
 * SharePoint Online connector trigger registrations.
 */
export interface SharepointTriggers {
    /** Registers a trigger that fires when a new file is created. Handler items are typed as `BlobMetadata[]`. */
    onNewFile(name: string, options: TypedTriggerOptions<BlobMetadata>): void;

    /** Registers a trigger that fires when an existing file is modified. Handler items are typed as `BlobMetadata[]`. */
    onUpdatedFile(name: string, options: TypedTriggerOptions<BlobMetadata>): void;
}

/**
 * Teams connector trigger registrations.
 */
export interface TeamsTriggers {
    /** Registers a trigger that fires when a new channel message is posted. Handler items are typed as `ChatMessage[]`. */
    onNewChannelMessage(name: string, options: TypedTriggerOptions<ChatMessage>): void;
}

/**
 * Kusto connector trigger registrations.
 */
export interface KustoTriggers {
    /** Registers a trigger that fires when a Kusto query returns new results. Handler items are typed as `Row[]`. */
    onQueryResult(name: string, options: TypedTriggerOptions<Row>): void;
}

/**
 * First-class connector trigger registrations grouped by connector.
 */
export interface ConnectorsContent {
    /** Office 365 connector triggers (email, calendar). */
    office365: Office365Triggers;

    /** SharePoint Online connector triggers (files). */
    sharepoint: SharepointTriggers;

    /** Teams connector triggers (messages). */
    teams: TeamsTriggers;

    /** Kusto connector triggers (queries). */
    kusto: KustoTriggers;
}

/**
 * First-class connector trigger registrations.
 *
 * @example
 * ```typescript
 * import { connectors, GraphClientReceiveMessage } from '@azure/functions-extensions-connectors';
 *
 * connectors.office365.onNewEmail('OnNewEmail', {
 *     connection: 'Office365Connection',
 *     handler: async (context, invocationContext) => {
 *         // context.items is GraphClientReceiveMessage[] — fully typed, no cast needed
 *         for (const email of context.items) {
 *             invocationContext.log(`Subject: '${email.subject}'.`);
 *         }
 *     },
 * });
 * ```
 */
export const connectors: ConnectorsContent;
