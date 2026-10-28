// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { TriggerCallbackPayload } from '@azure/connectors';
import { RefreshModel } from '@azure/connectors/generated/DataflowsExtensions';
import { Row } from '@azure/connectors/generated/KustoExtensions';
import { GraphCalendarEventClientReceive, GraphCalendarEventClientWithActionType, GraphClientReceiveMessage } from '@azure/connectors/generated/Office365Extensions';
import { BlobMetadata as OneDriveBlobMetadata } from '@azure/connectors/generated/OnedriveforbusinessExtensions';
import { GetTaskResponseV2 as PlannerTask } from '@azure/connectors/generated/PlannerExtensions';
import { Item as SalesforceItem } from '@azure/connectors/generated/SalesforceExtensions';
import { BlobMetadata, DeletedItem, Item as SharepointItem } from '@azure/connectors/generated/SharepointonlineExtensions';
import { ChatMessage } from '@azure/connectors/generated/TeamsExtensions';
import { BuildResult, GitPullRequest, GitPush, TfvcChangeset, TriggerWorkItemResponse } from '@azure/connectors/generated/VisualstudioteamservicesExtensions';
import { FunctionInput, FunctionOutput, InvocationContext } from '@azure/functions';

// ---------------------------------------------------------------------------
// Re-export connector SDK types used as trigger items.
// Customers can import these directly from this package.
// ---------------------------------------------------------------------------

export { TriggerCallbackBody, TriggerCallbackPayload } from '@azure/connectors';
export { Row as KustoRow } from '@azure/connectors/generated/KustoExtensions';
export { GraphCalendarEventClientReceive, GraphClientReceiveMessage } from '@azure/connectors/generated/Office365Extensions';
export { BlobMetadata } from '@azure/connectors/generated/SharepointonlineExtensions';
export { ChatMessage } from '@azure/connectors/generated/TeamsExtensions';
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
    OnedriveforbusinessOnNewFilesTriggerPayload,
    OnedriveforbusinessOnUpdatedFilesTriggerPayload,
} from '@azure/connectors/generated/OnedriveforbusinessExtensions';
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
    SharepointonlineOnChangedItemsTriggerPayload,
    SharepointonlineOnDeletedFileItemsTriggerPayload,
    SharepointonlineOnDeletedItemsTriggerPayload,
    SharepointonlineOnNewFileItemsTriggerPayload,
    SharepointonlineOnNewItemsTriggerPayload,
    SharepointonlineOnNewItemsFromFormTriggerPayload,
    SharepointonlineOnRecurrenceDigestTriggerPayload,
    SharepointonlineOnUpdatedFileClassifiedTimesTriggerPayload,
    SharepointonlineOnUpdatedFileItemsTriggerPayload,
    SharepointonlineOnUpdatedItemsTriggerPayload,
} from '@azure/connectors/generated/SharepointonlineExtensions';
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
    VisualstudioteamservicesOnBuildCompletedTriggerPayload,
    VisualstudioteamservicesOnGitPullClosedTriggerPayload,
    VisualstudioteamservicesOnGitPullCreatedTriggerPayload,
    VisualstudioteamservicesOnGitPushTriggerPayload,
    VisualstudioteamservicesOnTfvcCheckInTriggerPayload,
    VisualstudioteamservicesOnWorkItemAssignedTriggerPayload,
    VisualstudioteamservicesOnWorkItemClosedTriggerPayload,
    VisualstudioteamservicesOnWorkItemCreatedTriggerPayload,
    VisualstudioteamservicesOnWorkItemUpdatedTriggerPayload,
} from '@azure/connectors/generated/VisualstudioteamservicesExtensions';

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
export interface FileTriggerContext extends ConnectorTriggerContext<BlobMetadata> {
    /** The file metadata delivered by the trigger. Alias for `items`. */
    files: BlobMetadata[];
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
export interface SharepointItemTriggerContext extends ConnectorTriggerContext<SharepointItem> {
    /** SharePoint records. Alias for `items`. */
    records: SharepointItem[];
}

/** Deleted SharePoint list items or files. */
export interface DeletedItemTriggerContext extends ConnectorTriggerContext<DeletedItem> {
    /** Deleted items. Alias for `items`. */
    deletedItems: DeletedItem[];
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
export interface SharepointTriggers {
    /** Registers changed list items. */
    onChangedItems: ConnectorTriggerRegistration<SharepointItem, SharepointItemTriggerContext>;
    /** Registers deleted files. */
    onDeletedFileItems: ConnectorTriggerRegistration<DeletedItem, DeletedItemTriggerContext>;
    /** Registers deleted list items. */
    onDeletedItems: ConnectorTriggerRegistration<DeletedItem, DeletedItemTriggerContext>;
    /** Registers new file properties (not file content). */
    onNewFileItems: ConnectorTriggerRegistration<SharepointItem, SharepointItemTriggerContext>;
    /** Registers new list items. */
    onNewItems: ConnectorTriggerRegistration<SharepointItem, SharepointItemTriggerContext>;
    /** Registers list items submitted through a form. */
    onNewItemsFromForm: ConnectorTriggerRegistration<SharepointItem, SharepointItemTriggerContext>;
    /** Registers recurring list item digests. */
    onRecurrenceDigest: ConnectorTriggerRegistration<SharepointItem, SharepointItemTriggerContext>;
    /** Registers file classification changes. */
    onUpdatedFileClassifiedTimes: ConnectorTriggerRegistration<SharepointItem, SharepointItemTriggerContext>;
    /** Registers updated file properties (not file content). */
    onUpdatedFileItems: ConnectorTriggerRegistration<SharepointItem, SharepointItemTriggerContext>;
    /** Registers updated list items. */
    onUpdatedItems: ConnectorTriggerRegistration<SharepointItem, SharepointItemTriggerContext>;

    /** Registers a trigger that fires when a new file is created. Handler items are typed as `BlobMetadata[]`. */
    onNewFile(name: string, options: ConnectorTriggerOptions<BlobMetadata, FileTriggerContext>): void;

    /** Registers a trigger that fires when an existing file is modified. Handler items are typed as `BlobMetadata[]`. */
    onUpdatedFile(name: string, options: ConnectorTriggerOptions<BlobMetadata, FileTriggerContext>): void;
}

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
    sharepoint: SharepointTriggers;

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
