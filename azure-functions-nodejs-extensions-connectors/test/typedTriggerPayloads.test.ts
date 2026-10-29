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
        let appStub: sinon.SinonStub<Parameters<typeof app.connectorTrigger>, void>;
        let warnStub: sinon.SinonStub;
        const invocationContext = new InvocationContext();

        beforeEach(() => {
            appStub = sinon.stub(app, 'connectorTrigger');
            warnStub = sinon.stub(invocationContext, 'warn');
        });

        afterEach(() => {
            sinon.restore();
        });

        for (const [format, payload, expectedItems] of [
            ['batch', { body: { value: [item, item] } }, [item, item]],
            ['single item', { body: item }, [item]],
            ['JSON string', JSON.stringify({ body: { value: [item] } }), [item]],
            ['JSON single item', JSON.stringify({ body: item }), [item]],
            ['empty batch', { body: { value: [] } }, []],
            ['JSON empty batch', JSON.stringify({ body: { value: [] } }), []],
        ] as const) {
            it(`should normalize ${format} payloads and preserve aliases, bindings and results`, async () => {
                const extraInput = input.generic({ name: 'input', type: 'connectorContent' });
                const extraOutput = output.generic({ name: 'output', type: 'connectorContent' });
                const returnOutput = output.generic({ name: 'returnValue', type: 'http' });
                const extraInputs = [extraInput];
                const extraOutputs = [extraOutput];
                const result = { processed: true };
                let receivedContext: TContext | undefined;

                register(name, {
                    extraInputs,
                    extraOutputs,
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
                assert.strictEqual(options.extraInputs, extraInputs);
                assert.strictEqual(options.extraOutputs, extraOutputs);
                assert.strictEqual(options.return, returnOutput);
                assert.strictEqual(await options.handler(payload, invocationContext), result);
                assert.ok(receivedContext);
                assert.strictEqual(warnStub.called, false);
            });
        }

        for (const [description, payload] of [
            ['null payload', null],
            ['undefined payload', undefined],
            ['missing body', {}],
            ['null body', { body: null }],
            ['undefined body', { body: undefined }],
            ['empty body', { body: {} }],
        ] as const) {
            it(`should deliver an empty typed context without warnings for ${description}`, async () => {
                let handlerCalls = 0;
                register(name, {
                    handler: async (context) => {
                        handlerCalls++;
                        assert.deepStrictEqual(context.items, []);
                        assert.strictEqual(context[property], context.items);
                        assert.strictEqual(context.payload.body?.value, context.items);
                        assert.deepStrictEqual(context.rawPayload, payload ?? {});
                        assert.strictEqual(context.toJSON(), JSON.stringify(payload ?? {}));
                    },
                });

                await appStub.firstCall.args[1].handler(payload, invocationContext);

                assert.strictEqual(handlerCalls, 1);
                assert.strictEqual(warnStub.called, false);
            });
        }

        for (const malformedPayload of ['{invalid JSON', '', 'null']) {
            it(`should warn once and invoke the typed handler with empty aliases for ${JSON.stringify(malformedPayload)}`, async () => {
                let handlerCalls = 0;
                register(name, {
                    handler: async (context) => {
                        handlerCalls++;
                        assert.deepStrictEqual(context.items, []);
                        assert.strictEqual(context[property], context.items);
                        assert.strictEqual(context.payload.body?.value, context.items);
                        assert.strictEqual(context.rawPayload, malformedPayload);
                        assert.strictEqual(context.toJSON(), JSON.stringify(malformedPayload));
                        return 'handled malformed payload';
                    },
                });

                const result = await appStub.firstCall.args[1].handler(malformedPayload, invocationContext);

                assert.strictEqual(result, 'handled malformed payload');
                assert.strictEqual(handlerCalls, 1);
                assert.strictEqual(warnStub.calledOnce, true);
                assert.match(String(warnStub.firstCall.args[0]), /^Failed to parse connector trigger payload: '.+'\.$/);
            });
        }

        it('should retain the original envelope, metadata, item identity and serialization without mutating input', async () => {
            const payload = {
                body: { value: [item], continuationToken: 'next-page' },
                headers: { 'x-correlation-id': 'correlation' },
                metadata: { source: name, attempt: 0 },
            };
            const snapshot = JSON.stringify(payload);
            let handlerCalls = 0;
            register(name, {
                handler: async (context) => {
                    handlerCalls++;
                    assert.strictEqual(context.rawPayload, payload);
                    assert.strictEqual(context.items, payload.body.value);
                    assert.strictEqual(context.items[0], item);
                    assert.strictEqual(context[property], payload.body.value);
                    assert.notStrictEqual(context.payload, payload);
                    assert.deepStrictEqual(context.payload, { body: { value: [item] } });
                    assert.strictEqual(context.toJSON(), snapshot);
                },
            });

            await appStub.firstCall.args[1].handler(payload, invocationContext);

            assert.strictEqual(handlerCalls, 1);
            assert.strictEqual(JSON.stringify(payload), snapshot);
            assert.strictEqual(warnStub.called, false);
        });

        it('should not mutate frozen options or introduce optional bindings', () => {
            const handler = sinon.stub().resolves(undefined);
            const options = Object.freeze({ handler });

            assert.strictEqual(register(name, options), undefined);

            assert.strictEqual(options.handler, handler);
            assert.deepStrictEqual(Object.keys(options), ['handler']);
            assert.notStrictEqual(appStub.firstCall.args[1].handler, handler);
            assert.deepStrictEqual(Object.keys(appStub.firstCall.args[1]), ['handler']);
            assert.strictEqual(handler.called, false);
        });

        it('should preserve undefined, null and falsy handler return values', async () => {
            for (const [index, result] of [undefined, null, false, 0, ''].entries()) {
                register(`${name}-${index}`, {
                    handler: async () => result,
                });

                assert.strictEqual(await appStub.getCall(index).args[1].handler({ body: { value: [] } }, invocationContext), result);
            }
        });

        it('should propagate registration failures without invoking the handler or logging parse warnings', () => {
            const failure = new Error(`Registration '${name}' failed.`);
            const handler = sinon.stub().resolves(undefined);
            appStub.throws(failure);

            assert.throws(() => register(name, { handler }), (error: unknown) => error === failure);
            assert.strictEqual(handler.called, false);
            assert.strictEqual(warnStub.called, false);
        });

        it('should keep handlers isolated when the same helper registers multiple functions', async () => {
            const firstHandler = sinon.stub().resolves('first result');
            const secondHandler = sinon.stub().resolves('second result');
            register(`${name}-first`, { handler: firstHandler });
            register(`${name}-second`, { handler: secondHandler });

            assert.strictEqual(appStub.firstCall.args[0], `${name}-first`);
            assert.strictEqual(appStub.secondCall.args[0], `${name}-second`);
            assert.strictEqual(await appStub.secondCall.args[1].handler({ body: { value: [] } }, invocationContext), 'second result');
            assert.strictEqual(firstHandler.called, false);
            assert.strictEqual(await appStub.firstCall.args[1].handler({ body: { value: [item] } }, invocationContext), 'first result');
            assert.strictEqual(firstHandler.calledOnce, true);
            assert.strictEqual(secondHandler.calledOnce, true);
            assert.deepStrictEqual(firstHandler.firstCall.args[0].items, [item]);
            assert.deepStrictEqual(secondHandler.firstCall.args[0].items, []);
        });

        it('should keep contexts and invocation contexts isolated across overlapping asynchronous invocations', async () => {
            let releaseFirst: (() => void) | undefined;
            const firstGate = new Promise<void>((resolve) => {
                releaseFirst = resolve;
            });
            assert.ok(releaseFirst);
            const contexts: TContext[] = [];
            const firstInvocation = new InvocationContext({ invocationId: 'first' });
            const secondInvocation = new InvocationContext({ invocationId: 'second' });
            register(name, {
                handler: async (context, receivedInvocation) => {
                    contexts.push(context);
                    assert.strictEqual(context[property], context.items);
                    if (context.items.length > 0) {
                        assert.strictEqual(receivedInvocation, firstInvocation);
                        await firstGate;
                        assert.deepStrictEqual(context.items, [item]);
                    } else {
                        assert.strictEqual(receivedInvocation, secondInvocation);
                    }

                    return context.items.length;
                },
            });

            const wrappedHandler = appStub.firstCall.args[1].handler;
            const firstResult = wrappedHandler({ body: { value: [item] } }, firstInvocation);
            try {
                assert.strictEqual(await wrappedHandler({ body: { value: [] } }, secondInvocation), 0);
            } finally {
                releaseFirst();
            }

            assert.strictEqual(await firstResult, 1);
            assert.strictEqual(contexts.length, 2);
            assert.notStrictEqual(contexts[0], contexts[1]);
            assert.notStrictEqual(contexts[0]?.items, contexts[1]?.items);
            assert.notStrictEqual(contexts[0]?.payload, contexts[1]?.payload);
        });

        it('should propagate handler errors without treating them as parse failures', async () => {
            const failure = new Error(`Handler '${name}' failed.`);
            register(name, {
                handler: async () => {
                    await Promise.resolve();
                    throw failure;
                },
            });

            await assert.rejects(
                async () => await appStub.firstCall.args[1].handler({ body: { value: [item] } }, invocationContext),
                (error: unknown) => error === failure,
            );
            assert.strictEqual(warnStub.called, false);
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
