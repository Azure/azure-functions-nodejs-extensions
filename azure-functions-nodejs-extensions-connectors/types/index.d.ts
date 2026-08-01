// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { TriggerCallbackPayload } from '@azure/connectors';
import { BlobMetadata as AzureBlobMetadata } from '@azure/connectors/generated/AzureblobExtensions';
import { Row } from '@azure/connectors/generated/KustoExtensions';
import { GraphCalendarEventClientReceive, GraphClientReceiveMessage } from '@azure/connectors/generated/Office365Extensions';
import { BlobMetadata as OneDriveBlobMetadata } from '@azure/connectors/generated/OnedriveforbusinessExtensions';
import { BlobMetadata } from '@azure/connectors/generated/SharepointonlineExtensions';
import { ChatMessage } from '@azure/connectors/generated/TeamsExtensions';
import { FunctionInput, FunctionOutput, InvocationContext } from '@azure/functions';

// ---------------------------------------------------------------------------
// Re-export connector SDK types used as trigger items.
// Customers can import these directly from this package.
// ---------------------------------------------------------------------------

export { TriggerCallbackBody, TriggerCallbackPayload } from '@azure/connectors';
export { BlobMetadata as AzureBlobMetadata } from '@azure/connectors/generated/AzureblobExtensions';
export { Row as KustoRow } from '@azure/connectors/generated/KustoExtensions';
export { GraphCalendarEventClientReceive, GraphClientReceiveMessage } from '@azure/connectors/generated/Office365Extensions';
export { BlobMetadata as OneDriveBlobMetadata } from '@azure/connectors/generated/OnedriveforbusinessExtensions';
export { BlobMetadata } from '@azure/connectors/generated/SharepointonlineExtensions';
export { ChatMessage } from '@azure/connectors/generated/TeamsExtensions';

/** Generic Teams group membership change item. */
export type GroupMembershipChange = Record<string, unknown>;

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
export type ConnectorTriggerHandler<
    TItem = unknown,
    TContext extends ConnectorTriggerContext<TItem> = ConnectorTriggerContext<TItem>,
> = (
    context: TContext,
    invocationContext: InvocationContext,
) => Promise<unknown>;

// ---------------------------------------------------------------------------
// Generic connector trigger registration
// ---------------------------------------------------------------------------

/**
 * Options for registering a connector trigger function with {@link connectorTrigger}.
 */
export interface ConnectorTriggerOptions<
    TItem = unknown,
    TContext extends ConnectorTriggerContext<TItem> = ConnectorTriggerContext<TItem>,
> {
    /** Optional extra input bindings (e.g., blob storage, connector content). */
    extraInputs?: FunctionInput[];

    /** Optional extra output bindings (e.g., blob storage). */
    extraOutputs?: FunctionOutput[];

    /** Optional return output binding. */
    return?: FunctionOutput;

    /** The handler function that processes the trigger event. */
    handler: ConnectorTriggerHandler<TItem, TContext>;
}

/**
 * Registers a connector trigger function with the Azure Functions app.
 *
 * This wraps {@link app.connectorTrigger} with a strongly-typed {@link ConnectorTriggerContext}
 * that normalises the raw host payload into a consistent `items` array.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger configuration including handler and optional bindings.
 */
export function connectorTrigger<TItem = unknown>(name: string, options: ConnectorTriggerOptions<TItem>): void;

// ---------------------------------------------------------------------------
// Connector-specific trigger contexts
// ---------------------------------------------------------------------------

/** Trigger context for Azure Blob Storage file triggers. Provides `files` as a named alias for `items`. */
export interface AzureBlobFileTriggerContext extends ConnectorTriggerContext<AzureBlobMetadata> {
    /** The blob file metadata delivered by the trigger. Alias for `items`. */
    files: AzureBlobMetadata[];
}

/** Trigger context for Office 365 email triggers. Provides `emails` as a named alias for `items`. */
export interface EmailTriggerContext extends ConnectorTriggerContext<GraphClientReceiveMessage> {
    /** The emails delivered by the trigger. Alias for `items`. */
    emails: GraphClientReceiveMessage[];
}

/** Trigger context for Office 365 calendar triggers. Provides `calendarEvents` as a named alias for `items`. */
export interface CalendarEventTriggerContext extends ConnectorTriggerContext<GraphCalendarEventClientReceive> {
    /** The calendar events delivered by the trigger. Alias for `items`. */
    calendarEvents: GraphCalendarEventClientReceive[];
}

/** Trigger context for OneDrive for Business file triggers. Provides `files` as a named alias for `items`. */
export interface OneDriveFileTriggerContext extends ConnectorTriggerContext<OneDriveBlobMetadata> {
    /** The file metadata delivered by the trigger. Alias for `items`. */
    files: OneDriveBlobMetadata[];
}

/** Trigger context for SharePoint Online file triggers. Provides `files` as a named alias for `items`. */
export interface FileTriggerContext extends ConnectorTriggerContext<BlobMetadata> {
    /** The file metadata delivered by the trigger. Alias for `items`. */
    files: BlobMetadata[];
}

/** Trigger context for Teams channel message triggers. Provides `messages` as a named alias for `items`. */
export interface ChannelMessageTriggerContext extends ConnectorTriggerContext<ChatMessage> {
    /** The channel messages delivered by the trigger. Alias for `items`. */
    messages: ChatMessage[];
}

/** Trigger context for Teams group membership change triggers. Provides `members` as a named alias for `items`. */
export interface GroupMembershipTriggerContext extends ConnectorTriggerContext<GroupMembershipChange> {
    /** The group membership changes delivered by the trigger. Alias for `items`. */
    members: GroupMembershipChange[];
}

/** Trigger context for Kusto query result triggers. Provides `rows` as a named alias for `items`. */
export interface QueryResultTriggerContext extends ConnectorTriggerContext<Row> {
    /** The query result rows delivered by the trigger. Alias for `items`. */
    rows: Row[];
}

// ---------------------------------------------------------------------------
// Connector-specific trigger registrations
// ---------------------------------------------------------------------------

/**
 * Azure Blob Storage connector trigger registrations.
 */
export interface AzureBlobTriggers {
    /** Registers a trigger that fires when one or more blobs are added or modified in a container. Handler items are typed as `BlobMetadata[]`. */
    onUpdatedFile(name: string, options: ConnectorTriggerOptions<AzureBlobMetadata, AzureBlobFileTriggerContext>): void;
}

/**
 * Kusto connector trigger registrations.
 */
export interface KustoTriggers {
    /** Registers a trigger that fires when a Kusto query returns new results. Handler items are typed as `Row[]`. */
    onQueryResult(name: string, options: ConnectorTriggerOptions<Row, QueryResultTriggerContext>): void;
}

/**
 * Office 365 connector trigger registrations.
 */
export interface Office365Triggers {
    /** Registers a trigger that fires when an email is flagged. Handler items are typed as `GraphClientReceiveMessage[]`. */
    onFlaggedEmail(name: string, options: ConnectorTriggerOptions<GraphClientReceiveMessage, EmailTriggerContext>): void;

    /** Registers a trigger that fires when a new calendar event is created. Handler items are typed as `GraphCalendarEventClientReceive[]`. */
    onNewCalendarEvent(name: string, options: ConnectorTriggerOptions<GraphCalendarEventClientReceive, CalendarEventTriggerContext>): void;

    /** Registers a trigger that fires when a new email arrives. Handler items are typed as `GraphClientReceiveMessage[]`. */
    onNewEmail(name: string, options: ConnectorTriggerOptions<GraphClientReceiveMessage, EmailTriggerContext>): void;

    /** Registers a trigger that fires when a new email mentioning the signed-in user arrives. Handler items are typed as `GraphClientReceiveMessage[]`. */
    onNewMentionMeEmail(name: string, options: ConnectorTriggerOptions<GraphClientReceiveMessage, EmailTriggerContext>): void;

    /** Registers a trigger that fires for upcoming calendar events. Handler items are typed as `GraphCalendarEventClientReceive[]`. */
    onUpcomingEvent(name: string, options: ConnectorTriggerOptions<GraphCalendarEventClientReceive, CalendarEventTriggerContext>): void;
}

/**
 * OneDrive for Business connector trigger registrations.
 */
export interface OneDriveTriggers {
    /** Registers a trigger that fires when a new file is created. Handler items are typed as `BlobMetadata[]`. */
    onNewFile(name: string, options: ConnectorTriggerOptions<OneDriveBlobMetadata, OneDriveFileTriggerContext>): void;

    /** Registers a trigger that fires when an existing file is modified. Handler items are typed as `BlobMetadata[]`. */
    onUpdatedFile(name: string, options: ConnectorTriggerOptions<OneDriveBlobMetadata, OneDriveFileTriggerContext>): void;
}

/**
 * SharePoint Online connector trigger registrations.
 */
export interface SharepointTriggers {
    /** Registers a trigger that fires when a new file is created. Handler items are typed as `BlobMetadata[]`. */
    onNewFile(name: string, options: ConnectorTriggerOptions<BlobMetadata, FileTriggerContext>): void;

    /** Registers a trigger that fires when an existing file is modified. Handler items are typed as `BlobMetadata[]`. */
    onUpdatedFile(name: string, options: ConnectorTriggerOptions<BlobMetadata, FileTriggerContext>): void;
}

/**
 * Teams connector trigger registrations.
 */
export interface TeamsTriggers {
    /** Registers a trigger that fires when a member is added to a Teams group. Handler items are typed as `Record<string, unknown>[]`. */
    onGroupMembershipAdd(name: string, options: ConnectorTriggerOptions<GroupMembershipChange, GroupMembershipTriggerContext>): void;

    /** Registers a trigger that fires when a member is removed from a Teams group. Handler items are typed as `Record<string, unknown>[]`. */
    onGroupMembershipRemoval(name: string, options: ConnectorTriggerOptions<GroupMembershipChange, GroupMembershipTriggerContext>): void;

    /** Registers a trigger that fires when a new channel message is posted. Handler items are typed as `ChatMessage[]`. */
    onNewChannelMessage(name: string, options: ConnectorTriggerOptions<ChatMessage, ChannelMessageTriggerContext>): void;

    /** Registers a trigger that fires when a new channel message mentioning the signed-in user is posted. Handler items are typed as `ChatMessage[]`. */
    onNewChannelMessageMentioningMe(name: string, options: ConnectorTriggerOptions<ChatMessage, ChannelMessageTriggerContext>): void;
}

/**
 * First-class connector trigger registrations grouped by connector.
 */
export interface ConnectorTriggers {
    /** Azure Blob Storage connector triggers (files). */
    azureblob: AzureBlobTriggers;

    /** Kusto connector triggers (queries). */
    kusto: KustoTriggers;

    /** Office 365 connector triggers (email, calendar). */
    office365: Office365Triggers;

    /** OneDrive for Business connector triggers (files). */
    onedrive: OneDriveTriggers;

    /** SharePoint Online connector triggers (files). */
    sharepoint: SharepointTriggers;

    /** Teams connector triggers (messages, membership). */
    teams: TeamsTriggers;
}

/**
 * First-class connector trigger registrations.
 *
 * @example
 * ```typescript
 * import { connectors, GraphClientReceiveMessage } from '@azure/functions-extensions-connectors';
 *
 * connectors.office365.onNewEmail('OnNewEmail', {
 *     handler: async (context, invocationContext) => {
 *         // context.emails is GraphClientReceiveMessage[] — fully typed, no cast needed
 *         for (const email of context.emails) {
 *             invocationContext.log(`Subject: '${email.subject}'.`);
 *         }
 *     },
 * });
 * ```
 */
export const connectors: ConnectorTriggers;
