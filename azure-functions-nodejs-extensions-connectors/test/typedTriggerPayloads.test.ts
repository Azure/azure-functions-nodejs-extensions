// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import * as assert from 'assert';
import { app, InvocationContext, input, output } from '@azure/functions';
import * as sinon from 'sinon';
import { connectors } from '../src';
import { ConnectorTriggerContext, ConnectorTriggerRegistration } from '../types';

const testedRegistrations = new Set<string>();

function testTrigger<TItem, TContext extends ConnectorTriggerContext<TItem>>(
    name: string,
    register: ConnectorTriggerRegistration<TItem, TContext>,
    property: keyof TContext,
    item: TItem,
): void {
    testedRegistrations.add(name);
    describe(name, () => {
        let appStub: sinon.SinonStub;
        const invocationContext = new InvocationContext();

        beforeEach(() => {
            appStub = sinon.stub(app, 'connectorTrigger');
        });

        afterEach(() => {
            sinon.restore();
        });

        for (const [format, payload, expectedItems] of [
            ['batch', { body: { value: [item, item] } }, [item, item]],
            ['single item', { body: item }, [item]],
            ['JSON string', JSON.stringify({ body: { value: [item] } }), [item]],
            ['empty batch', { body: { value: [] } }, []],
        ] as const) {
            it(`should normalize ${format} payloads and preserve aliases, bindings and results`, async () => {
                const extraInput = input.generic({ name: 'input', type: 'connectorContent' });
                const extraOutput = output.generic({ name: 'output', type: 'connectorContent' });
                const returnOutput = output.generic({ name: 'returnValue', type: 'http' });
                const result = { processed: true };
                let receivedContext: TContext | undefined;

                register(name, {
                    extraInputs: [extraInput],
                    extraOutputs: [extraOutput],
                    return: returnOutput,
                    handler: async (context, receivedInvocationContext) => {
                        receivedContext = context;
                        assert.strictEqual(receivedInvocationContext, invocationContext);
                        assert.strictEqual(context[property], context.items);
                        assert.strictEqual(context.payload.body?.value, context.items);
                        assert.deepStrictEqual(context.items, expectedItems);
                        assert.deepStrictEqual(JSON.parse(context.toJSON()), context.rawPayload);
                        return result;
                    },
                });

                assert.strictEqual(appStub.calledOnce, true);
                assert.strictEqual(appStub.firstCall.args[0], name);
                const options = appStub.firstCall.args[1];
                assert.deepStrictEqual(options.extraInputs, [extraInput]);
                assert.deepStrictEqual(options.extraOutputs, [extraOutput]);
                assert.strictEqual(options.return, returnOutput);
                assert.strictEqual(await options.handler(payload, invocationContext), result);
                assert.ok(receivedContext);
            });
        }

        it('should propagate handler errors without treating them as parse failures', async () => {
            const failure = new Error(`Handler '${name}' failed.`);
            register(name, {
                handler: async () => {
                    throw failure;
                },
            });

            await assert.rejects(
                appStub.firstCall.args[1].handler({ body: { value: [item] } }, invocationContext),
                (error: unknown) => error === failure,
            );
        });
    });
}

describe('typed trigger payloads', () => {
    testTrigger('office365.onCalendarChangedItems', connectors.office365.onCalendarChangedItems, 'calendarEvents', { subject: 'Changed' });
    testTrigger('office365.onCalendarNewItems', connectors.office365.onCalendarNewItems, 'calendarEvents', { subject: 'New' });
    testTrigger('office365.onCalendarUpdatedItems', connectors.office365.onCalendarUpdatedItems, 'calendarEvents', { subject: 'Updated' });
    testTrigger('office365.onNewCalendarEvent', connectors.office365.onNewCalendarEvent, 'calendarEvents', { subject: 'Event' });
    testTrigger('office365.onFlaggedEmail', connectors.office365.onFlaggedEmail, 'emails', { subject: 'Flagged' });
    testTrigger('office365.onNewEmail', connectors.office365.onNewEmail, 'emails', { subject: 'New' });
    testTrigger('office365.onNewEmailMentioningMe', connectors.office365.onNewEmailMentioningMe, 'emails', { subject: 'Mention' });
    testTrigger('office365.onSharedMailboxNewEmail', connectors.office365.onSharedMailboxNewEmail, 'emails', { subject: 'Shared' });
    testTrigger('office365.onUpcomingEvents', connectors.office365.onUpcomingEvents, 'calendarEvents', { subject: 'Upcoming' });
    testTrigger('sharepoint.onChangedItems', connectors.sharepoint.onChangedItems, 'records', { dynamicProperties: {} });
    testTrigger('sharepoint.onDeletedFileItems', connectors.sharepoint.onDeletedFileItems, 'deletedItems', { ID: 1 });
    testTrigger('sharepoint.onDeletedItems', connectors.sharepoint.onDeletedItems, 'deletedItems', { ID: 2 });
    testTrigger('sharepoint.onNewFile', connectors.sharepoint.onNewFile, 'files', { Name: 'file.txt' });
    testTrigger('sharepoint.onNewFileItems', connectors.sharepoint.onNewFileItems, 'records', { dynamicProperties: {} });
    testTrigger('sharepoint.onNewItems', connectors.sharepoint.onNewItems, 'records', { dynamicProperties: {} });
    testTrigger('sharepoint.onNewItemsFromForm', connectors.sharepoint.onNewItemsFromForm, 'records', { dynamicProperties: {} });
    testTrigger('sharepoint.onRecurrenceDigest', connectors.sharepoint.onRecurrenceDigest, 'records', { dynamicProperties: {} });
    testTrigger('sharepoint.onUpdatedFile', connectors.sharepoint.onUpdatedFile, 'files', { Name: 'updated.txt' });
    testTrigger('sharepoint.onUpdatedFileClassifiedTimes', connectors.sharepoint.onUpdatedFileClassifiedTimes, 'records', { dynamicProperties: {} });
    testTrigger('sharepoint.onUpdatedFileItems', connectors.sharepoint.onUpdatedFileItems, 'records', { dynamicProperties: {} });
    testTrigger('sharepoint.onUpdatedItems', connectors.sharepoint.onUpdatedItems, 'records', { dynamicProperties: {} });
    testTrigger('onedriveforbusiness.onNewFiles', connectors.onedriveforbusiness.onNewFiles, 'files', { Name: 'new.txt' });
    testTrigger('onedriveforbusiness.onUpdatedFiles', connectors.onedriveforbusiness.onUpdatedFiles, 'files', { Name: 'updated.txt' });
    testTrigger('teams.onNewChannelMessage', connectors.teams.onNewChannelMessage, 'messages', { id: 'message' });
    testTrigger('teams.onNewChannelMessageMentioningMe', connectors.teams.onNewChannelMessageMentioningMe, 'messages', { id: 'mention' });
    testTrigger('teams.onTeamMemberAdded', connectors.teams.onTeamMemberAdded, 'members', { userId: 'added' });
    testTrigger('teams.onTeamMemberRemoved', connectors.teams.onTeamMemberRemoved, 'members', { userId: 'removed' });
    testTrigger('planner.onCompleteTask', connectors.planner.onCompleteTask, 'tasks', { id: 'complete', percentComplete: 100 });
    testTrigger('planner.onNewTask', connectors.planner.onNewTask, 'tasks', { id: 'new', title: 'New task' });
    testTrigger('planner.onTaskAssignedToMe', connectors.planner.onTaskAssignedToMe, 'tasks', { id: 'assigned' });
    testTrigger('salesforce.onNewItems', connectors.salesforce.onNewItems, 'records', { dynamicProperties: {} });
    testTrigger('salesforce.onUpdatedItems', connectors.salesforce.onUpdatedItems, 'records', { dynamicProperties: {} });
    testTrigger('vsts.onBuildCompleted', connectors.vsts.onBuildCompleted, 'builds', { id: 1 });
    testTrigger('vsts.onGitPullClosed', connectors.vsts.onGitPullClosed, 'pullRequests', { pullRequestId: 1 });
    testTrigger('vsts.onGitPullCreated', connectors.vsts.onGitPullCreated, 'pullRequests', { pullRequestId: 2 });
    testTrigger('vsts.onGitPush', connectors.vsts.onGitPush, 'pushes', { pushId: 1 });
    testTrigger('vsts.onTfvcCheckIn', connectors.vsts.onTfvcCheckIn, 'changesets', { changesetId: 1 });
    testTrigger('vsts.onWorkItemAssigned', connectors.vsts.onWorkItemAssigned, 'workItems', { id: 1 });
    testTrigger('vsts.onWorkItemClosed', connectors.vsts.onWorkItemClosed, 'workItems', { id: 2 });
    testTrigger('vsts.onWorkItemCreated', connectors.vsts.onWorkItemCreated, 'workItems', { id: 3 });
    testTrigger('vsts.onWorkItemUpdated', connectors.vsts.onWorkItemUpdated, 'workItems', { id: 4 });
    testTrigger('dataflows.onRefreshComplete', connectors.dataflows.onRefreshComplete, 'refreshes', { dataflowId: 'flow', status: 'Success' });

    it('should exercise every registration across the eight requested connectors', () => {
        const registrations = Object.entries(connectors)
            .filter(([connectorName]) => connectorName !== 'kusto')
            .flatMap(([connectorName, triggers]) => Object.keys(triggers).map((triggerName) => `${connectorName}.${triggerName}`));
        assert.deepStrictEqual([...testedRegistrations].sort(), registrations.sort());
    });
});
