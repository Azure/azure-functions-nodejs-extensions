// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import type * as sdkOffice365 from '@azure/connectors/generated/Office365Extensions';
import type * as sdkOneDrive from '@azure/connectors/generated/OnedriveforbusinessExtensions';
import type * as sdkPlanner from '@azure/connectors/generated/PlannerExtensions';
import type * as sdkSalesforce from '@azure/connectors/generated/SalesforceExtensions';
import type * as sdkSharepoint from '@azure/connectors/generated/SharepointonlineExtensions';
import type * as sdkTeams from '@azure/connectors/generated/TeamsExtensions';
import type * as sdkVsts from '@azure/connectors/generated/VisualstudioteamservicesExtensions';
import type { RefreshModel } from '@azure/connectors/generated/DataflowsExtensions';
import type { InvocationContext } from '@azure/functions';
import type * as publicTypes from '@azure/functions-extensions-connectors';
import type * as sourceTypes from '../../src';
import { connectors } from '../../src';

type Assert<Condition extends true> = Condition;
type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends
    (<Value>() => Value extends Right ? 1 : 2) ? true : false;
type Context<Registration> = Registration extends (
    name: string,
    options: { handler: (context: infer TriggerContext, invocationContext: InvocationContext) => Promise<unknown> },
) => void ? TriggerContext : never;
type Payload<Registration> = Context<Registration> extends { payload: infer TriggerPayload } ? TriggerPayload : never;
type NamedAliases<Registration> = Omit<Context<Registration>, keyof publicTypes.ConnectorTriggerContext>;
type RegistrationContexts<Groups> = {
    -readonly [Group in keyof Groups]: {
        -readonly [Operation in keyof Groups[Group]]: Context<Groups[Group][Operation]>;
    };
};
type AllPayloads = {
    office365: {
        onCalendarChangedItems: sdkOffice365.Office365OnCalendarChangedItemsTriggerPayload;
        onCalendarNewItems: sdkOffice365.Office365OnCalendarNewItemsTriggerPayload;
        onCalendarUpdatedItems: sdkOffice365.Office365OnCalendarUpdatedItemsTriggerPayload;
        onFlaggedEmail: sdkOffice365.Office365OnFlaggedEmailTriggerPayload;
        onNewEmail: sdkOffice365.Office365OnNewEmailTriggerPayload;
        onNewEmailMentioningMe: sdkOffice365.Office365OnNewEmailMentioningMeTriggerPayload;
        onSharedMailboxNewEmail: sdkOffice365.Office365OnSharedMailboxNewEmailTriggerPayload;
        onUpcomingEvents: sdkOffice365.Office365OnUpcomingEventsTriggerPayload;
    };
    sharepoint: {
        onChangedItems: sdkSharepoint.SharepointonlineOnChangedItemsTriggerPayload;
        onDeletedFileItems: sdkSharepoint.SharepointonlineOnDeletedFileItemsTriggerPayload;
        onDeletedItems: sdkSharepoint.SharepointonlineOnDeletedItemsTriggerPayload;
        onNewFileItems: sdkSharepoint.SharepointonlineOnNewFileItemsTriggerPayload;
        onNewItems: sdkSharepoint.SharepointonlineOnNewItemsTriggerPayload;
        onNewItemsFromForm: sdkSharepoint.SharepointonlineOnNewItemsFromFormTriggerPayload;
        onRecurrenceDigest: sdkSharepoint.SharepointonlineOnRecurrenceDigestTriggerPayload;
        onUpdatedFileClassifiedTimes: sdkSharepoint.SharepointonlineOnUpdatedFileClassifiedTimesTriggerPayload;
        onUpdatedFileItems: sdkSharepoint.SharepointonlineOnUpdatedFileItemsTriggerPayload;
        onUpdatedItems: sdkSharepoint.SharepointonlineOnUpdatedItemsTriggerPayload;
    };
    onedriveforbusiness: {
        onNewFiles: sdkOneDrive.OnedriveforbusinessOnNewFilesTriggerPayload;
        onUpdatedFiles: sdkOneDrive.OnedriveforbusinessOnUpdatedFilesTriggerPayload;
    };
    teams: {
        onNewChannelMessage: sdkTeams.TeamsOnNewChannelMessageTriggerPayload;
        onNewChannelMessageMentioningMe: sdkTeams.TeamsOnNewChannelMessageMentioningMeTriggerPayload;
        onTeamMemberAdded: sdkTeams.TeamsOnTeamMemberAddedTriggerPayload;
        onTeamMemberRemoved: sdkTeams.TeamsOnTeamMemberRemovedTriggerPayload;
    };
    planner: {
        onCompleteTask: sdkPlanner.PlannerOnCompleteTaskTriggerPayload;
        onNewTask: sdkPlanner.PlannerOnNewTaskTriggerPayload;
        onTaskAssignedToMe: sdkPlanner.PlannerOnTaskAssignedToMeTriggerPayload;
    };
    salesforce: {
        onNewItems: sdkSalesforce.SalesforceOnNewItemsTriggerPayload;
        onUpdatedItems: sdkSalesforce.SalesforceOnUpdatedItemsTriggerPayload;
    };
    vsts: {
        onBuildCompleted: sdkVsts.VisualstudioteamservicesOnBuildCompletedTriggerPayload;
        onGitPullClosed: sdkVsts.VisualstudioteamservicesOnGitPullClosedTriggerPayload;
        onGitPullCreated: sdkVsts.VisualstudioteamservicesOnGitPullCreatedTriggerPayload;
        onGitPush: sdkVsts.VisualstudioteamservicesOnGitPushTriggerPayload;
        onTfvcCheckIn: sdkVsts.VisualstudioteamservicesOnTfvcCheckInTriggerPayload;
        onWorkItemAssigned: sdkVsts.VisualstudioteamservicesOnWorkItemAssignedTriggerPayload;
        onWorkItemClosed: sdkVsts.VisualstudioteamservicesOnWorkItemClosedTriggerPayload;
        onWorkItemCreated: sdkVsts.VisualstudioteamservicesOnWorkItemCreatedTriggerPayload;
        onWorkItemUpdated: sdkVsts.VisualstudioteamservicesOnWorkItemUpdatedTriggerPayload;
    };
    dataflows: {
        onRefreshComplete: publicTypes.TriggerCallbackPayload<RefreshModel>;
    };
};
type RegistrationPayloads<Groups> = {
    [Group in keyof AllPayloads]: Group extends keyof Groups ? {
        [Operation in keyof AllPayloads[Group]]: Operation extends keyof Groups[Group]
            ? Payload<Groups[Group][Operation]>
            : never;
    } : never;
};
export type TriggerPayloadAssertions = [
    Assert<Equal<RegistrationPayloads<typeof connectors>, AllPayloads>>,
    Assert<Equal<RegistrationPayloads<publicTypes.ConnectorTriggers>, AllPayloads>>,
    Assert<Equal<publicTypes.DataflowsOnRefreshCompleteTriggerPayload, publicTypes.TriggerCallbackPayload<RefreshModel>>>,
    Assert<Equal<sourceTypes.OneDriveBlobMetadata, sdkOneDrive.BlobMetadata>>,
    Assert<Equal<publicTypes.SharepointItem, sdkSharepoint.Item>>,
    Assert<Equal<publicTypes.SalesforceItem, sdkSalesforce.Item>>,
    Assert<Equal<RegistrationContexts<typeof connectors>, RegistrationContexts<publicTypes.ConnectorTriggers>>>,
];

export type NamedAliasAssertions = [
    Assert<Equal<NamedAliases<typeof connectors.office365.onNewEmail>, { emails: sdkOffice365.GraphClientReceiveMessage[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.office365.onNewCalendarEvent>, { calendarEvents: sdkOffice365.GraphCalendarEventClientReceive[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.office365.onCalendarChangedItems>, { calendarEvents: sdkOffice365.GraphCalendarEventClientWithActionType[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.sharepoint.onNewItems>, { records: sdkSharepoint.Item[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.sharepoint.onDeletedItems>, { deletedItems: sdkSharepoint.DeletedItem[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.sharepoint.onNewFile>, { files: sdkSharepoint.BlobMetadata[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.onedriveforbusiness.onNewFiles>, { files: sdkOneDrive.BlobMetadata[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.teams.onNewChannelMessage>, { messages: sdkTeams.ChatMessage[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.teams.onTeamMemberAdded>, { members: Record<string, unknown>[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.planner.onNewTask>, { tasks: sdkPlanner.GetTaskResponseV2[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.salesforce.onNewItems>, { records: sdkSalesforce.Item[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.vsts.onBuildCompleted>, { builds: sdkVsts.BuildResult[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.vsts.onGitPullCreated>, { pullRequests: sdkVsts.GitPullRequest[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.vsts.onGitPush>, { pushes: sdkVsts.GitPush[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.vsts.onTfvcCheckIn>, { changesets: sdkVsts.TfvcChangeset[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.vsts.onWorkItemCreated>, { workItems: sdkVsts.TriggerWorkItemResponse[] }>>,
    Assert<Equal<NamedAliases<typeof connectors.dataflows.onRefreshComplete>, { refreshes: RefreshModel[] }>>,
];

export type PayloadExportAssertions = [
    Assert<Equal<publicTypes.Office365OnCalendarChangedItemsTriggerPayload, sdkOffice365.Office365OnCalendarChangedItemsTriggerPayload>>,
    Assert<Equal<publicTypes.Office365OnCalendarNewItemsTriggerPayload, sdkOffice365.Office365OnCalendarNewItemsTriggerPayload>>,
    Assert<Equal<publicTypes.Office365OnCalendarUpdatedItemsTriggerPayload, sdkOffice365.Office365OnCalendarUpdatedItemsTriggerPayload>>,
    Assert<Equal<publicTypes.Office365OnFlaggedEmailTriggerPayload, sdkOffice365.Office365OnFlaggedEmailTriggerPayload>>,
    Assert<Equal<publicTypes.Office365OnNewEmailTriggerPayload, sdkOffice365.Office365OnNewEmailTriggerPayload>>,
    Assert<Equal<publicTypes.Office365OnNewEmailMentioningMeTriggerPayload, sdkOffice365.Office365OnNewEmailMentioningMeTriggerPayload>>,
    Assert<Equal<publicTypes.Office365OnSharedMailboxNewEmailTriggerPayload, sdkOffice365.Office365OnSharedMailboxNewEmailTriggerPayload>>,
    Assert<Equal<publicTypes.Office365OnUpcomingEventsTriggerPayload, sdkOffice365.Office365OnUpcomingEventsTriggerPayload>>,
    Assert<Equal<publicTypes.SharepointonlineOnChangedItemsTriggerPayload, sdkSharepoint.SharepointonlineOnChangedItemsTriggerPayload>>,
    Assert<Equal<publicTypes.SharepointonlineOnDeletedFileItemsTriggerPayload, sdkSharepoint.SharepointonlineOnDeletedFileItemsTriggerPayload>>,
    Assert<Equal<publicTypes.SharepointonlineOnDeletedItemsTriggerPayload, sdkSharepoint.SharepointonlineOnDeletedItemsTriggerPayload>>,
    Assert<Equal<publicTypes.SharepointonlineOnNewFileItemsTriggerPayload, sdkSharepoint.SharepointonlineOnNewFileItemsTriggerPayload>>,
    Assert<Equal<publicTypes.SharepointonlineOnNewItemsTriggerPayload, sdkSharepoint.SharepointonlineOnNewItemsTriggerPayload>>,
    Assert<Equal<publicTypes.SharepointonlineOnNewItemsFromFormTriggerPayload, sdkSharepoint.SharepointonlineOnNewItemsFromFormTriggerPayload>>,
    Assert<Equal<publicTypes.SharepointonlineOnRecurrenceDigestTriggerPayload, sdkSharepoint.SharepointonlineOnRecurrenceDigestTriggerPayload>>,
    Assert<Equal<publicTypes.SharepointonlineOnUpdatedFileClassifiedTimesTriggerPayload, sdkSharepoint.SharepointonlineOnUpdatedFileClassifiedTimesTriggerPayload>>,
    Assert<Equal<publicTypes.SharepointonlineOnUpdatedFileItemsTriggerPayload, sdkSharepoint.SharepointonlineOnUpdatedFileItemsTriggerPayload>>,
    Assert<Equal<publicTypes.SharepointonlineOnUpdatedItemsTriggerPayload, sdkSharepoint.SharepointonlineOnUpdatedItemsTriggerPayload>>,
    Assert<Equal<publicTypes.OnedriveforbusinessOnNewFilesTriggerPayload, sdkOneDrive.OnedriveforbusinessOnNewFilesTriggerPayload>>,
    Assert<Equal<publicTypes.OnedriveforbusinessOnUpdatedFilesTriggerPayload, sdkOneDrive.OnedriveforbusinessOnUpdatedFilesTriggerPayload>>,
    Assert<Equal<publicTypes.TeamsOnNewChannelMessageTriggerPayload, sdkTeams.TeamsOnNewChannelMessageTriggerPayload>>,
    Assert<Equal<publicTypes.TeamsOnNewChannelMessageMentioningMeTriggerPayload, sdkTeams.TeamsOnNewChannelMessageMentioningMeTriggerPayload>>,
    Assert<Equal<publicTypes.TeamsOnTeamMemberAddedTriggerPayload, sdkTeams.TeamsOnTeamMemberAddedTriggerPayload>>,
    Assert<Equal<publicTypes.TeamsOnTeamMemberRemovedTriggerPayload, sdkTeams.TeamsOnTeamMemberRemovedTriggerPayload>>,
    Assert<Equal<publicTypes.PlannerOnCompleteTaskTriggerPayload, sdkPlanner.PlannerOnCompleteTaskTriggerPayload>>,
    Assert<Equal<publicTypes.PlannerOnNewTaskTriggerPayload, sdkPlanner.PlannerOnNewTaskTriggerPayload>>,
    Assert<Equal<publicTypes.PlannerOnTaskAssignedToMeTriggerPayload, sdkPlanner.PlannerOnTaskAssignedToMeTriggerPayload>>,
    Assert<Equal<publicTypes.SalesforceOnNewItemsTriggerPayload, sdkSalesforce.SalesforceOnNewItemsTriggerPayload>>,
    Assert<Equal<publicTypes.SalesforceOnUpdatedItemsTriggerPayload, sdkSalesforce.SalesforceOnUpdatedItemsTriggerPayload>>,
    Assert<Equal<publicTypes.VisualstudioteamservicesOnBuildCompletedTriggerPayload, sdkVsts.VisualstudioteamservicesOnBuildCompletedTriggerPayload>>,
    Assert<Equal<publicTypes.VisualstudioteamservicesOnGitPullClosedTriggerPayload, sdkVsts.VisualstudioteamservicesOnGitPullClosedTriggerPayload>>,
    Assert<Equal<publicTypes.VisualstudioteamservicesOnGitPullCreatedTriggerPayload, sdkVsts.VisualstudioteamservicesOnGitPullCreatedTriggerPayload>>,
    Assert<Equal<publicTypes.VisualstudioteamservicesOnGitPushTriggerPayload, sdkVsts.VisualstudioteamservicesOnGitPushTriggerPayload>>,
    Assert<Equal<publicTypes.VisualstudioteamservicesOnTfvcCheckInTriggerPayload, sdkVsts.VisualstudioteamservicesOnTfvcCheckInTriggerPayload>>,
    Assert<Equal<publicTypes.VisualstudioteamservicesOnWorkItemAssignedTriggerPayload, sdkVsts.VisualstudioteamservicesOnWorkItemAssignedTriggerPayload>>,
    Assert<Equal<publicTypes.VisualstudioteamservicesOnWorkItemClosedTriggerPayload, sdkVsts.VisualstudioteamservicesOnWorkItemClosedTriggerPayload>>,
    Assert<Equal<publicTypes.VisualstudioteamservicesOnWorkItemCreatedTriggerPayload, sdkVsts.VisualstudioteamservicesOnWorkItemCreatedTriggerPayload>>,
    Assert<Equal<publicTypes.VisualstudioteamservicesOnWorkItemUpdatedTriggerPayload, sdkVsts.VisualstudioteamservicesOnWorkItemUpdatedTriggerPayload>>,
    Assert<Equal<sourceTypes.Office365OnNewEmailTriggerPayload, publicTypes.Office365OnNewEmailTriggerPayload>>,
    Assert<Equal<sourceTypes.DataflowsOnRefreshCompleteTriggerPayload, publicTypes.DataflowsOnRefreshCompleteTriggerPayload>>,
];

/**
 * Verifies contextual inference and rejects fields not present in the SDK.
 */
export function verifyHandlerInference(): void {
    connectors.office365.onNewEmail('emailTypes', {
        handler: async (context) => {
            const emails: sdkOffice365.GraphClientReceiveMessage[] = context.emails;
            const subjects: (string | undefined)[] = emails.map((email) => email.subject);
            // @ts-expect-error Office 365 email subjects are not task titles.
            context.emails.map((email) => email.title);
            return subjects;
        },
    });
    connectors.office365.onCalendarChangedItems('calendarChangeTypes', {
        handler: async (context) => {
            const events: sdkOffice365.GraphCalendarEventClientWithActionType[] = context.calendarEvents;
            const actions: (string | undefined)[] = events.map((event) => event.ActionType);
            // @ts-expect-error The SDK action field is PascalCase.
            context.calendarEvents.map((event) => event.actionType);
            return actions;
        },
    });
    connectors.sharepoint.onNewFileItems('sharepointPropertyTypes', {
        handler: async (context) => {
            const records: sdkSharepoint.Item[] = context.records;
            // @ts-expect-error File-property records are not BlobMetadata.
            context.records.map((record) => record.Name);
            // @ts-expect-error Dynamic SharePoint fields must be narrowed before treating them as strings.
            const titles: string[] = records.map((record) => record.dynamicProperties?.CustomFields?.Title);
            return { records, titles };
        },
    });
    connectors.sharepoint.onDeletedItems('sharepointDeletionTypes', {
        handler: async (context) => {
            const deletedItems: sdkSharepoint.DeletedItem[] = context.deletedItems;
            const identifiers: (number | undefined)[] = deletedItems.map((item) => item.ID);
            // @ts-expect-error The SDK deleted item identifier is uppercase.
            context.deletedItems.map((item) => item.id);
            return identifiers;
        },
    });
    connectors.planner.onNewTask('plannerTypes', {
        handler: async (context) => {
            const tasks: sdkPlanner.GetTaskResponseV2[] = context.tasks;
            const titles: (string | undefined)[] = tasks.map((task) => task.title);
            // @ts-expect-error Planner tasks do not have email subjects.
            context.tasks.map((task) => task.subject);
            return titles;
        },
    });
    connectors.onedriveforbusiness.onNewFiles('oneDriveTypes', {
        handler: async (context) => {
            const files: sdkOneDrive.BlobMetadata[] = context.files;
            // @ts-expect-error OneDrive file names are PascalCase in the SDK.
            context.files.map((file) => file.name);
            return files;
        },
    });
    connectors.teams.onNewChannelMessage('teamsMessageTypes', {
        handler: async (context) => {
            const messages: sdkTeams.ChatMessage[] = context.messages;
            const identifiers: (string | undefined)[] = messages.map((message) => message.id);
            // @ts-expect-error Teams message bodies are dynamic objects, not strings.
            const bodies: string[] = messages.map((message) => message.body);
            return { identifiers, bodies };
        },
    });
    connectors.teams.onTeamMemberAdded('teamsMemberTypes', {
        handler: async (context) => {
            const members: Record<string, unknown>[] = context.members;
            // @ts-expect-error The SDK does not guarantee the types of member fields.
            const identifiers: string[] = members.map((member) => member.userId);
            return identifiers;
        },
    });
    connectors.salesforce.onNewItems('salesforceTypes', {
        handler: async (context) => {
            const records: sdkSalesforce.Item[] = context.records;
            // @ts-expect-error The SDK does not invent fixed Salesforce object properties.
            context.records.map((record) => record.Id);
            // @ts-expect-error Dynamic Salesforce values must be narrowed before treating them as strings.
            const names: string[] = records.map((record) => record.dynamicProperties?.Account?.Name);
            return { records, names };
        },
    });
    connectors.vsts.onBuildCompleted('buildTypes', {
        handler: async (context) => {
            const builds: sdkVsts.BuildResult[] = context.builds;
            const identifiers: (number | undefined)[] = builds.map((build) => build.id);
            // @ts-expect-error Build identifiers are numeric, not strings.
            const stringIdentifiers: string[] = builds.map((build) => build.id);
            return { identifiers, stringIdentifiers };
        },
    });
    connectors.vsts.onGitPullCreated('pullRequestTypes', {
        handler: async (context) => {
            const requests: sdkVsts.GitPullRequest[] = context.pullRequests;
            // @ts-expect-error Pull requests do not have push identifiers.
            requests.map((request) => request.pushId);
            return requests.map((request) => request.pullRequestId);
        },
    });
    connectors.vsts.onGitPush('pushTypes', {
        handler: async (context) => {
            const pushes: sdkVsts.GitPush[] = context.pushes;
            // @ts-expect-error Git pushes do not have TFVC changeset identifiers.
            pushes.map((push) => push.changesetId);
            return pushes.map((push) => push.pushId);
        },
    });
    connectors.vsts.onTfvcCheckIn('changesetTypes', {
        handler: async (context) => {
            const changesets: sdkVsts.TfvcChangeset[] = context.changesets;
            // @ts-expect-error TFVC changesets do not have pull request identifiers.
            changesets.map((changeset) => changeset.pullRequestId);
            return changesets.map((changeset) => changeset.changesetId);
        },
    });
    connectors.vsts.onWorkItemCreated('workItemTypes', {
        handler: async (context) => {
            const workItems: sdkVsts.TriggerWorkItemResponse[] = context.workItems;
            // @ts-expect-error Work item field values are unknown until narrowed.
            const titles: string[] = workItems.map((workItem) => workItem.fields?.['System.Title']);
            return { workItems, titles };
        },
    });
    connectors.dataflows.onRefreshComplete('dataflowTypes', {
        handler: async (context) => {
            const payload: publicTypes.DataflowsOnRefreshCompleteTriggerPayload = context.payload;
            const refreshes: RefreshModel[] = context.refreshes;
            // @ts-expect-error The SDK Dataflows model uses status, not refreshStatus.
            refreshes.map((refresh) => refresh.refreshStatus);
            return { payload, refreshes };
        },
    });
}

/**
 * Verifies that the published declarations reject handlers for the wrong connector.
 * @param registrations - The public connector namespace.
 */
export function verifyHandlerCompatibility(registrations: publicTypes.ConnectorTriggers): void {
    const emailHandler: publicTypes.ConnectorTriggerHandler<sdkOffice365.GraphClientReceiveMessage, publicTypes.EmailTriggerContext> = async () => undefined;
    const plannerHandler: publicTypes.ConnectorTriggerHandler<sdkPlanner.GetTaskResponseV2, publicTypes.PlannerTaskTriggerContext> = async () => undefined;
    const sharepointFileHandler: publicTypes.ConnectorTriggerHandler<sdkSharepoint.BlobMetadata, publicTypes.FileTriggerContext> = async () => undefined;

    // @ts-expect-error Planner registrations must not accept email contexts.
    registrations.planner.onNewTask('wrongPlannerHandler', { handler: emailHandler });
    // @ts-expect-error Email registrations must not accept Planner task contexts.
    registrations.office365.onNewEmail('wrongEmailHandler', { handler: plannerHandler });
    // @ts-expect-error SharePoint file properties must not accept legacy file metadata contexts.
    registrations.sharepoint.onNewFileItems('wrongSharepointHandler', { handler: sharepointFileHandler });
    registrations.onedriveforbusiness.onNewFiles('wrongOneDriveHandler', {
        // @ts-expect-error OneDrive metadata registrations must not accept record contexts.
        handler: async (context: publicTypes.SalesforceRecordTriggerContext) => context.records,
    });
}
