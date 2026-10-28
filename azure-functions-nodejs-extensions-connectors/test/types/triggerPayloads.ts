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
    connectors.dataflows.onRefreshComplete('dataflowTypes', {
        handler: async (context) => {
            const payload: publicTypes.DataflowsOnRefreshCompleteTriggerPayload = context.payload;
            const refreshes: RefreshModel[] = context.refreshes;
            return { payload, refreshes };
        },
    });
}
