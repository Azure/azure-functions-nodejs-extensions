// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { TriggerCallbackPayload } from '@azure/connectors';
import { RefreshModel } from '@azure/connectors/generated/DataflowsExtensions';
import { Row } from '@azure/connectors/generated/KustoExtensions';
import { GraphCalendarEventClientReceive, GraphCalendarEventClientWithActionType, GraphClientReceiveMessage } from '@azure/connectors/generated/Office365Extensions';
import { BlobMetadata as OneDriveBlobMetadata } from '@azure/connectors/generated/OneDriveForBusinessExtensions';
import { GetTaskResponseV2 as PlannerTask } from '@azure/connectors/generated/PlannerExtensions';
import { Item as SalesforceItem } from '@azure/connectors/generated/SalesforceExtensions';
import {
    BlobMetadata as SharePointOnlineBlobMetadata,
    DeletedItem as SharePointOnlineDeletedItem,
    Item as SharePointOnlineItem,
} from '@azure/connectors/generated/SharePointOnlineExtensions';
import { ChatMessage } from '@azure/connectors/generated/TeamsExtensions';
import { BuildResult, GitPullRequest, GitPush, TfvcChangeset, TriggerWorkItemResponse } from '@azure/connectors/generated/VisualStudioTeamServicesExtensions';
import { ConnectorTriggerOptions as FunctionsConnectorTriggerOptions, FunctionInput, FunctionOutput, InvocationContext } from '@azure/functions';

// ---------------------------------------------------------------------------
// Re-export connector SDK types used as trigger items.
// Customers can import these directly from this package.
// ---------------------------------------------------------------------------

export { TriggerCallbackBody, TriggerCallbackPayload } from '@azure/connectors';
export { Row as KustoRow } from '@azure/connectors/generated/KustoExtensions';
export { GraphCalendarEventClientReceive, GraphClientReceiveMessage } from '@azure/connectors/generated/Office365Extensions';
export { BlobMetadata } from '@azure/connectors/generated/SharePointOnlineExtensions';
export { ChatMessage } from '@azure/connectors/generated/TeamsExtensions';
export type {
    BlobMetadata as SharePointOnlineBlobMetadata,
    DeletedItem as SharePointOnlineDeletedItem,
    Item as SharePointOnlineItem,
} from '@azure/connectors/generated/SharePointOnlineExtensions';
export type { RefreshModel } from '@azure/connectors/generated/DataflowsExtensions';
export type {
    GraphCalendarEventClientWithActionType,
    Office365OnCalendarChangedItemsTriggerPayload,
    Office365OnCalendarNewItemsTriggerPayload,
    Office365OnCalendarUpdatedItemsTriggerPayload,
    Office365OnFlaggedEmailTriggerPayload,
    Office365OnNewEmailTriggerPayload,
    Office365OnNewEmailMentioningMeTriggerPayload,
    Office365OnSharedMailboxNewEmailTriggerPayload,
    Office365OnUpcomingEventsTriggerPayload,
} from '@azure/connectors/generated/Office365Extensions';
export type {
    BlobMetadata as OneDriveBlobMetadata,
    OneDriveForBusinessOnNewFilesTriggerPayload,
    OneDriveForBusinessOnUpdatedFilesTriggerPayload,
} from '@azure/connectors/generated/OneDriveForBusinessExtensions';
export type {
    GetTaskResponseV2 as PlannerTask,
    PlannerOnCompleteTaskTriggerPayload,
    PlannerOnNewTaskTriggerPayload,
    PlannerOnTaskAssignedToMeTriggerPayload,
} from '@azure/connectors/generated/PlannerExtensions';
export type {
    Item as SalesforceItem,
    SalesforceOnNewItemsTriggerPayload,
    SalesforceOnUpdatedItemsTriggerPayload,
} from '@azure/connectors/generated/SalesforceExtensions';
export type {
    DeletedItem,
    Item as SharepointItem,
    SharePointOnlineOnChangedItemsTriggerPayload,
    SharePointOnlineOnDeletedFileItemsTriggerPayload,
    SharePointOnlineOnDeletedItemsTriggerPayload,
    SharePointOnlineOnNewFileItemsTriggerPayload,
    SharePointOnlineOnNewItemsTriggerPayload,
    SharePointOnlineOnNewItemsFromFormTriggerPayload,
    SharePointOnlineOnRecurrenceDigestTriggerPayload,
    SharePointOnlineOnUpdatedFileClassifiedTimesTriggerPayload,
    SharePointOnlineOnUpdatedFileItemsTriggerPayload,
    SharePointOnlineOnUpdatedItemsTriggerPayload,
} from '@azure/connectors/generated/SharePointOnlineExtensions';
export type {
    TeamsOnNewChannelMessageTriggerPayload,
    TeamsOnNewChannelMessageMentioningMeTriggerPayload,
    TeamsOnTeamMemberAddedTriggerPayload,
    TeamsOnTeamMemberRemovedTriggerPayload,
} from '@azure/connectors/generated/TeamsExtensions';
export type {
    BuildResult,
    GitPullRequest,
    GitPush,
    TfvcChangeset,
    TriggerWorkItemResponse,
    VisualStudioTeamServicesOnBuildCompletedTriggerPayload,
    VisualStudioTeamServicesOnGitPullClosedTriggerPayload,
    VisualStudioTeamServicesOnGitPullCreatedTriggerPayload,
    VisualStudioTeamServicesOnGitPushTriggerPayload,
    VisualStudioTeamServicesOnTfvcCheckInTriggerPayload,
    VisualStudioTeamServicesOnWorkItemAssignedTriggerPayload,
    VisualStudioTeamServicesOnWorkItemClosedTriggerPayload,
    VisualStudioTeamServicesOnWorkItemCreatedTriggerPayload,
    VisualStudioTeamServicesOnWorkItemUpdatedTriggerPayload,
} from '@azure/connectors/generated/VisualStudioTeamServicesExtensions';

// ---------------------------------------------------------------------------
// Core trigger context
// ---------------------------------------------------------------------------

/**
 * Context object delivered to connector trigger handlers.
 * Wraps the AI Gateway trigger callback payload with typed access to items.
 */
export interface ConnectorTriggerContext<TItem = unknown> {
    /** The normalized trigger callback envelope, combining all items in a polling batch. */
    payload: TriggerCallbackPayload<TItem>;

    /** The items delivered by the connector trigger (convenience accessor for payload.body.value). */
    items: TItem[];

    /**
     * The original parsed payload object or polling envelope array (before envelope extraction).
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
 * Includes the polling and batching options from `@azure/functions`.
 */
export interface ConnectorTriggerOptions<
    TItem = unknown,
    TContext extends ConnectorTriggerContext<TItem> = ConnectorTriggerContext<TItem>,
> extends Pick<
    FunctionsConnectorTriggerOptions,
    'deliveryMode' | 'connection' | 'triggerConfigName' | 'cardinality' |
    'maxBatchSize' | 'maxConcurrentCalls' | 'targetPendingEventThreshold'
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

/**
 * Registers a named connector trigger with typed options.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export type ConnectorTriggerRegistration<TItem, TContext extends ConnectorTriggerContext<TItem>> = (
    name: string,
    options: ConnectorTriggerOptions<TItem, TContext>,
) => void;

// ---------------------------------------------------------------------------
// Connector-specific trigger registrations
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Connector-specific trigger contexts
// ---------------------------------------------------------------------------

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

/** Trigger context for SharePoint file triggers. Provides `files` as a named alias for `items`. */
export interface FileTriggerContext extends ConnectorTriggerContext<SharePointOnlineBlobMetadata> {
    /** The file metadata delivered by the trigger. Alias for `items`. */
    files: SharePointOnlineBlobMetadata[];
}

/** Trigger context for Teams channel message triggers. Provides `messages` as a named alias for `items`. */
export interface ChannelMessageTriggerContext extends ConnectorTriggerContext<ChatMessage> {
    /** The channel messages delivered by the trigger. Alias for `items`. */
    messages: ChatMessage[];
}

/** Trigger context for Kusto query result triggers. Provides `rows` as a named alias for `items`. */
export interface QueryResultTriggerContext extends ConnectorTriggerContext<Row> {
    /** The query result rows delivered by the trigger. Alias for `items`. */
    rows: Row[];
}

/** Calendar changes, including the SDK action type. */
export interface CalendarChangedEventTriggerContext extends ConnectorTriggerContext<GraphCalendarEventClientWithActionType> {
    /** Calendar changes. Alias for `items`. */
    calendarEvents: GraphCalendarEventClientWithActionType[];
}

/** SharePoint list items and file properties with dynamic SDK fields. */
export interface SharePointOnlineItemTriggerContext extends ConnectorTriggerContext<SharePointOnlineItem> {
    /** SharePoint records. Alias for `items`. */
    records: SharePointOnlineItem[];
}

export interface SharepointItemTriggerContext extends SharePointOnlineItemTriggerContext {}

/** Deleted SharePoint list items or files. */
export interface DeletedItemTriggerContext extends ConnectorTriggerContext<SharePointOnlineDeletedItem> {
    /** Deleted items. Alias for `items`. */
    deletedItems: SharePointOnlineDeletedItem[];
}

/** OneDrive for Business file metadata. */
export interface OneDriveFileTriggerContext extends ConnectorTriggerContext<OneDriveBlobMetadata> {
    /** File metadata. Alias for `items`. */
    files: OneDriveBlobMetadata[];
}

/** Planner tasks. */
export interface PlannerTaskTriggerContext extends ConnectorTriggerContext<PlannerTask> {
    /** Tasks. Alias for `items`. */
    tasks: PlannerTask[];
}

/** Salesforce records with dynamic SDK fields. */
export interface SalesforceRecordTriggerContext extends ConnectorTriggerContext<SalesforceItem> {
    /** Salesforce records. Alias for `items`. */
    records: SalesforceItem[];
}

/** Teams membership changes; the SDK does not define individual member fields. */
export interface TeamMemberTriggerContext extends ConnectorTriggerContext<Record<string, unknown>> {
    /** Membership changes. Alias for `items`. */
    members: Record<string, unknown>[];
}

/** Completed Azure DevOps builds. */
export interface BuildCompletedTriggerContext extends ConnectorTriggerContext<BuildResult> {
    /** Completed builds. Alias for `items`. */
    builds: BuildResult[];
}

/** Azure DevOps Git pull requests. */
export interface GitPullRequestTriggerContext extends ConnectorTriggerContext<GitPullRequest> {
    /** Pull requests. Alias for `items`. */
    pullRequests: GitPullRequest[];
}

/** Azure DevOps Git pushes. */
export interface GitPushTriggerContext extends ConnectorTriggerContext<GitPush> {
    /** Pushes. Alias for `items`. */
    pushes: GitPush[];
}

/** Azure DevOps TFVC check-ins. */
export interface TfvcChangesetTriggerContext extends ConnectorTriggerContext<TfvcChangeset> {
    /** Changesets. Alias for `items`. */
    changesets: TfvcChangeset[];
}

/** Azure DevOps work item changes. */
export interface WorkItemTriggerContext extends ConnectorTriggerContext<TriggerWorkItemResponse> {
    /** Work items. Alias for `items`. */
    workItems: TriggerWorkItemResponse[];
}

/**
 * Normalized Dataflows refresh callback using the SDK refresh model.
 * The SDK does not export a callback envelope alias for this webhook.
 */
export type DataflowsOnRefreshCompleteTriggerPayload = TriggerCallbackPayload<RefreshModel>;

/** Completed Dataflows refreshes. */
export interface DataflowRefreshTriggerContext extends ConnectorTriggerContext<RefreshModel> {
    /** Refresh results. Alias for `items`. */
    refreshes: RefreshModel[];
}

// ---------------------------------------------------------------------------
// Connector-specific trigger registrations
// ---------------------------------------------------------------------------

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
    /** Registers calendar changes, including the change action. */
    onCalendarChangedItems: ConnectorTriggerRegistration<GraphCalendarEventClientWithActionType, CalendarChangedEventTriggerContext>;

    /** Registers newly created calendar events. Alias for `onNewCalendarEvent`. */
    onCalendarNewItems: ConnectorTriggerRegistration<GraphCalendarEventClientReceive, CalendarEventTriggerContext>;

    /** Registers updated calendar events. */
    onCalendarUpdatedItems: ConnectorTriggerRegistration<GraphCalendarEventClientReceive, CalendarEventTriggerContext>;

    /** Registers flagged emails. */
    onFlaggedEmail: ConnectorTriggerRegistration<GraphClientReceiveMessage, EmailTriggerContext>;

    /** Registers emails mentioning the current user. */
    onNewEmailMentioningMe: ConnectorTriggerRegistration<GraphClientReceiveMessage, EmailTriggerContext>;

    /** Registers new shared mailbox emails. */
    onSharedMailboxNewEmail: ConnectorTriggerRegistration<GraphClientReceiveMessage, EmailTriggerContext>;

    /** Registers upcoming calendar events. */
    onUpcomingEvents: ConnectorTriggerRegistration<GraphCalendarEventClientReceive, CalendarEventTriggerContext>;

    /** Registers a trigger that fires when a new calendar event is created. Handler items are typed as `GraphCalendarEventClientReceive[]`. */
    onNewCalendarEvent(name: string, options: ConnectorTriggerOptions<GraphCalendarEventClientReceive, CalendarEventTriggerContext>): void;

    /** Registers a trigger that fires when a new email arrives. Handler items are typed as `GraphClientReceiveMessage[]`. */
    onNewEmail(name: string, options: ConnectorTriggerOptions<GraphClientReceiveMessage, EmailTriggerContext>): void;
}

/**
 * SharePoint Online connector trigger registrations.
 */
export interface SharePointOnlineTriggers {
    /** Registers changed list items. */
    onChangedItems: ConnectorTriggerRegistration<SharePointOnlineItem, SharePointOnlineItemTriggerContext>;
    /** Registers deleted files. */
    onDeletedFileItems: ConnectorTriggerRegistration<SharePointOnlineDeletedItem, DeletedItemTriggerContext>;
    /** Registers deleted list items. */
    onDeletedItems: ConnectorTriggerRegistration<SharePointOnlineDeletedItem, DeletedItemTriggerContext>;
    /** Registers new file properties (not file content). */
    onNewFileItems: ConnectorTriggerRegistration<SharePointOnlineItem, SharePointOnlineItemTriggerContext>;
    /** Registers new list items. */
    onNewItems: ConnectorTriggerRegistration<SharePointOnlineItem, SharePointOnlineItemTriggerContext>;
    /** Registers list items submitted through a form. */
    onNewItemsFromForm: ConnectorTriggerRegistration<SharePointOnlineItem, SharePointOnlineItemTriggerContext>;
    /** Registers recurring list item digests. */
    onRecurrenceDigest: ConnectorTriggerRegistration<SharePointOnlineItem, SharePointOnlineItemTriggerContext>;
    /** Registers file classification changes. */
    onUpdatedFileClassifiedTimes: ConnectorTriggerRegistration<SharePointOnlineItem, SharePointOnlineItemTriggerContext>;
    /** Registers updated file properties (not file content). */
    onUpdatedFileItems: ConnectorTriggerRegistration<SharePointOnlineItem, SharePointOnlineItemTriggerContext>;
    /** Registers updated list items. */
    onUpdatedItems: ConnectorTriggerRegistration<SharePointOnlineItem, SharePointOnlineItemTriggerContext>;

    /** Registers a trigger that fires when a new file is created. Handler items are typed as `BlobMetadata[]`. */
    onNewFile(name: string, options: ConnectorTriggerOptions<SharePointOnlineBlobMetadata, FileTriggerContext>): void;

    /** Registers a trigger that fires when an existing file is modified. Handler items are typed as `BlobMetadata[]`. */
    onUpdatedFile(name: string, options: ConnectorTriggerOptions<SharePointOnlineBlobMetadata, FileTriggerContext>): void;
}

export interface SharepointTriggers extends SharePointOnlineTriggers {}

/**
 * Teams connector trigger registrations.
 */
export interface TeamsTriggers {
    /** Registers channel messages mentioning the current user. */
    onNewChannelMessageMentioningMe: ConnectorTriggerRegistration<ChatMessage, ChannelMessageTriggerContext>;
    /** Registers team membership additions. */
    onTeamMemberAdded: ConnectorTriggerRegistration<Record<string, unknown>, TeamMemberTriggerContext>;
    /** Registers team membership removals. */
    onTeamMemberRemoved: ConnectorTriggerRegistration<Record<string, unknown>, TeamMemberTriggerContext>;

    /** Registers a trigger that fires when a new channel message is posted. Handler items are typed as `ChatMessage[]`. */
    onNewChannelMessage(name: string, options: ConnectorTriggerOptions<ChatMessage, ChannelMessageTriggerContext>): void;
}

/** OneDrive for Business metadata triggers. */
export interface OneDriveForBusinessTriggers {
    /** Registers newly created file metadata. */
    onNewFiles: ConnectorTriggerRegistration<OneDriveBlobMetadata, OneDriveFileTriggerContext>;
    /** Registers updated file metadata. */
    onUpdatedFiles: ConnectorTriggerRegistration<OneDriveBlobMetadata, OneDriveFileTriggerContext>;
}

/** Planner task triggers. */
export interface PlannerTriggers {
    /** Registers completed tasks. */
    onCompleteTask: ConnectorTriggerRegistration<PlannerTask, PlannerTaskTriggerContext>;
    /** Registers new tasks. */
    onNewTask: ConnectorTriggerRegistration<PlannerTask, PlannerTaskTriggerContext>;
    /** Registers tasks assigned to the current user. */
    onTaskAssignedToMe: ConnectorTriggerRegistration<PlannerTask, PlannerTaskTriggerContext>;
}

/** Salesforce record triggers. */
export interface SalesforceTriggers {
    /** Registers newly created records. */
    onNewItems: ConnectorTriggerRegistration<SalesforceItem, SalesforceRecordTriggerContext>;
    /** Registers updated records. */
    onUpdatedItems: ConnectorTriggerRegistration<SalesforceItem, SalesforceRecordTriggerContext>;
}

/** Azure DevOps (VSTS) triggers. */
export interface VstsTriggers {
    /** Registers completed builds. */
    onBuildCompleted: ConnectorTriggerRegistration<BuildResult, BuildCompletedTriggerContext>;
    /** Registers closed pull requests. */
    onGitPullClosed: ConnectorTriggerRegistration<GitPullRequest, GitPullRequestTriggerContext>;
    /** Registers created pull requests. */
    onGitPullCreated: ConnectorTriggerRegistration<GitPullRequest, GitPullRequestTriggerContext>;
    /** Registers Git pushes. */
    onGitPush: ConnectorTriggerRegistration<GitPush, GitPushTriggerContext>;
    /** Registers TFVC check-ins. */
    onTfvcCheckIn: ConnectorTriggerRegistration<TfvcChangeset, TfvcChangesetTriggerContext>;
    /** Registers assigned work items. */
    onWorkItemAssigned: ConnectorTriggerRegistration<TriggerWorkItemResponse, WorkItemTriggerContext>;
    /** Registers closed work items. */
    onWorkItemClosed: ConnectorTriggerRegistration<TriggerWorkItemResponse, WorkItemTriggerContext>;
    /** Registers created work items. */
    onWorkItemCreated: ConnectorTriggerRegistration<TriggerWorkItemResponse, WorkItemTriggerContext>;
    /** Registers updated work items. */
    onWorkItemUpdated: ConnectorTriggerRegistration<TriggerWorkItemResponse, WorkItemTriggerContext>;
}

/** Dataflows refresh triggers. */
export interface DataflowsTriggers {
    /** Registers completed dataflow refreshes. */
    onRefreshComplete: ConnectorTriggerRegistration<RefreshModel, DataflowRefreshTriggerContext>;
}

/**
 * First-class connector trigger registrations grouped by connector.
 */
export interface ConnectorTriggers {
    /** Dataflows refresh triggers. */
    dataflows: DataflowsTriggers;

    /** Kusto connector triggers (queries). */
    kusto: KustoTriggers;

    /** Office 365 connector triggers (email, calendar). */
    office365: Office365Triggers;

    /** OneDrive for Business file metadata triggers. */
    onedriveforbusiness: OneDriveForBusinessTriggers;

    /** Planner task triggers. */
    planner: PlannerTriggers;

    /** Salesforce record triggers. */
    salesforce: SalesforceTriggers;

    /** SharePoint Online connector triggers (files). */
    sharepoint: SharePointOnlineTriggers;

    /** Teams connector triggers (messages). */
    teams: TeamsTriggers;

    /** Azure DevOps (VSTS) triggers. */
    vsts: VstsTriggers;
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
