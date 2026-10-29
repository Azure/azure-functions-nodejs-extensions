// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import * as assert from 'assert';
import { app, InvocationContext } from '@azure/functions';
import * as sinon from 'sinon';
import { connectors } from '../src';
import type {
    BlobMetadata,
    BuildResult,
    ChatMessage,
    ConnectorTriggerContext,
    ConnectorTriggerRegistration,
    DeletedItem,
    GitPullRequest,
    GitPush,
    GraphCalendarEventClientReceive,
    GraphCalendarEventClientWithActionType,
    GraphClientReceiveMessage,
    OneDriveBlobMetadata,
    PlannerTask,
    RefreshModel,
    SalesforceItem,
    SharepointItem,
    TfvcChangeset,
    TriggerWorkItemResponse,
} from '../types';

function testPayloadFidelity<TItem, TContext extends ConnectorTriggerContext<TItem>>(
    name: string,
    register: ConnectorTriggerRegistration<TItem, TContext>,
    property: keyof TContext,
    items: [TItem, TItem],
    verifyFields: (context: TContext) => void,
): void {
    describe(name, () => {
        let appStub: sinon.SinonStub<Parameters<typeof app.connectorTrigger>, void>;

        beforeEach(() => {
            appStub = sinon.stub(app, 'connectorTrigger');
        });

        afterEach(() => {
            sinon.restore();
        });

        for (const [format, payload, expectedItems] of [
            ['object batch', { body: { value: items } }, items],
            ['JSON batch', JSON.stringify({ body: { value: items } }), items],
            ['object single item', { body: items[0] }, [items[0]]],
            ['JSON single item', JSON.stringify({ body: items[0] }), [items[0]]],
        ] as const) {
            it(`should preserve SDK-specific fields and item order in a ${format}`, async () => {
                const snapshot = JSON.stringify(payload);
                let handlerCalls = 0;
                register(name, {
                    handler: async (context) => {
                        handlerCalls++;
                        assert.strictEqual(context[property], context.items);
                        assert.deepStrictEqual(context.items, expectedItems);
                        verifyFields(context);
                        return context.items;
                    },
                });

                const result = await appStub.firstCall.args[1].handler(payload, new InvocationContext());

                assert.strictEqual(handlerCalls, 1);
                assert.deepStrictEqual(result, expectedItems);
                assert.strictEqual(JSON.stringify(payload), snapshot);
            });
        }
    });
}

describe('connector-specific payload fidelity', () => {
    const email: GraphClientReceiveMessage = {
        id: 'email-1',
        subject: '',
        from: 'sender@example.test',
        toRecipients: 'recipient@example.test',
        body: '<p>Hello</p>',
        isHtml: true,
        isRead: false,
        hasAttachments: true,
        attachments: [{ id: 'attachment-1', name: 'empty.txt', size: 0, isInline: false, contentBytes: '' }],
    };
    testPayloadFidelity('Office 365 email attachments and falsy fields', connectors.office365.onNewEmail, 'emails', [email, {}], (context) => {
        assert.strictEqual(context.emails[0]?.subject, '');
        assert.strictEqual(context.emails[0]?.isRead, false);
        assert.deepStrictEqual(context.emails[0]?.attachments, [
            { id: 'attachment-1', name: 'empty.txt', size: 0, isInline: false, contentBytes: '' },
        ]);
    });

    const calendarEvent: GraphCalendarEventClientReceive = {
        id: 'event-1',
        subject: 'Planning',
        startWithTimeZone: '2026-10-28T10:00:00+00:00',
        endWithTimeZone: '2026-10-28T11:00:00+00:00',
        timeZone: 'UTC',
        categories: ['Planning', 'Team'],
        isAllDay: false,
        reminderMinutesBeforeStart: 0,
    };
    testPayloadFidelity('Office 365 calendar time zones and categories', connectors.office365.onCalendarUpdatedItems, 'calendarEvents', [calendarEvent, {}], (context) => {
        assert.strictEqual(context.calendarEvents[0]?.startWithTimeZone, '2026-10-28T10:00:00+00:00');
        assert.deepStrictEqual(context.calendarEvents[0]?.categories, ['Planning', 'Team']);
        assert.strictEqual(context.calendarEvents[0]?.reminderMinutesBeforeStart, 0);
    });

    const calendarChange: GraphCalendarEventClientWithActionType = {
        ...calendarEvent,
        ActionType: 'deleted',
        IsAdded: false,
        IsUpdated: false,
    };
    testPayloadFidelity('Office 365 calendar change action casing', connectors.office365.onCalendarChangedItems, 'calendarEvents', [calendarChange, {}], (context) => {
        assert.strictEqual(context.calendarEvents[0]?.ActionType, 'deleted');
        assert.strictEqual(context.calendarEvents[0]?.IsAdded, false);
        assert.strictEqual(context.calendarEvents[0]?.IsUpdated, false);
    });

    const sharepointRecord: SharepointItem = {
        dynamicProperties: {
            CustomFields: { Title: 'Document', Count: 0, Approved: false, Description: '', Reviewer: null, Tags: ['one', 'two'] },
        },
    };
    testPayloadFidelity('SharePoint dynamic list and file properties', connectors.sharepoint.onNewFileItems, 'records', [sharepointRecord, {}], (context) => {
        assert.deepStrictEqual(context.records[0]?.dynamicProperties?.CustomFields, {
            Title: 'Document', Count: 0, Approved: false, Description: '', Reviewer: null, Tags: ['one', 'two'],
        });
        assert.strictEqual('files' in context, false);
    });

    const deletedItem: DeletedItem = {
        ID: 0,
        Name: 'deleted.txt',
        FileNameWithExtension: 'deleted.txt',
        DeletedByUserName: 'user@example.test',
        TimeDeleted: '2026-10-28T10:00:00Z',
        IsFolder: false,
    };
    testPayloadFidelity('SharePoint deleted item identifiers and deletion metadata', connectors.sharepoint.onDeletedFileItems, 'deletedItems', [deletedItem, {}], (context) => {
        assert.strictEqual(context.deletedItems[0]?.ID, 0);
        assert.strictEqual(context.deletedItems[0]?.IsFolder, false);
        assert.strictEqual(context.deletedItems[0]?.DeletedByUserName, 'user@example.test');
    });

    const sharepointFile: BlobMetadata = { Id: 'sharepoint-file', Name: 'empty.txt', Size: 0, IsFolder: false };
    testPayloadFidelity('legacy SharePoint file metadata compatibility', connectors.sharepoint.onNewFile, 'files', [sharepointFile, {}], (context) => {
        assert.strictEqual(context.files[0]?.Name, 'empty.txt');
        assert.strictEqual(context.files[0]?.Size, 0);
        assert.strictEqual('records' in context, false);
    });

    const oneDriveFile: OneDriveBlobMetadata = {
        Id: 'onedrive-file',
        Name: 'empty.txt',
        Path: '/Documents/empty.txt',
        Size: 0,
        IsFolder: false,
        ETag: '"version-1"',
        LastModifiedBy: 'user@example.test',
    };
    testPayloadFidelity('OneDrive for Business metadata casing and versions', connectors.onedriveforbusiness.onUpdatedFiles, 'files', [oneDriveFile, {}], (context) => {
        assert.strictEqual(context.files[0]?.Path, '/Documents/empty.txt');
        assert.strictEqual(context.files[0]?.ETag, '"version-1"');
        assert.strictEqual(context.files[0]?.Size, 0);
        assert.strictEqual(context.files[0]?.IsFolder, false);
    });

    const message: ChatMessage = {
        id: 'message-1',
        body: { contentType: 'html', content: '<p>Hello</p>' },
        from: { user: { id: 'user-1', displayName: 'Sender' } },
        mentions: [{ id: 0, mentioned: { user: { id: 'user-2' } } }],
        reactions: [{ reactionType: 'like', user: { id: 'user-2' } }],
        attachments: [{ id: 'attachment-1', contentUrl: null }],
        deleted: false,
    };
    testPayloadFidelity('Teams message content, mentions and reactions', connectors.teams.onNewChannelMessageMentioningMe, 'messages', [message, {}], (context) => {
        assert.strictEqual(context.messages[0]?.body?.content, '<p>Hello</p>');
        assert.deepStrictEqual(context.messages[0]?.mentions, [{ id: 0, mentioned: { user: { id: 'user-2' } } }]);
        assert.deepStrictEqual(context.messages[0]?.reactions, [{ reactionType: 'like', user: { id: 'user-2' } }]);
        assert.strictEqual(context.messages[0]?.deleted, false);
    });

    const member: Record<string, unknown> = {
        userId: 'member-1',
        roles: ['owner'],
        profile: { displayName: '', active: false, lastSeen: null },
    };
    testPayloadFidelity('Teams membership dynamic fields', connectors.teams.onTeamMemberAdded, 'members', [member, {}], (context) => {
        assert.deepStrictEqual(context.members[0]?.roles, ['owner']);
        assert.deepStrictEqual(context.members[0]?.profile, { displayName: '', active: false, lastSeen: null });
        assert.strictEqual('messages' in context, false);
    });

    const task: PlannerTask = {
        id: 'task-1',
        title: 'Review',
        planId: 'plan-1',
        bucketId: 'bucket-1',
        percentComplete: 0,
        hasDescription: false,
        _assignments: [{ userId: 'user-1', orderHint: ' !' }],
        createdBy: { user: { id: 'creator-1' } },
    };
    testPayloadFidelity('Planner task assignments and progress', connectors.planner.onTaskAssignedToMe, 'tasks', [task, {}], (context) => {
        assert.strictEqual(context.tasks[0]?.percentComplete, 0);
        assert.strictEqual(context.tasks[0]?.hasDescription, false);
        assert.deepStrictEqual(context.tasks[0]?._assignments, [{ userId: 'user-1', orderHint: ' !' }]);
    });

    const salesforceRecord: SalesforceItem = {
        dynamicProperties: {
            Account: { Id: 'account-1', Active__c: false, Revenue__c: 0, Description: '', ParentId: null },
        },
    };
    testPayloadFidelity('Salesforce custom object fields', connectors.salesforce.onUpdatedItems, 'records', [salesforceRecord, {}], (context) => {
        assert.deepStrictEqual(context.records[0]?.dynamicProperties?.Account, {
            Id: 'account-1', Active__c: false, Revenue__c: 0, Description: '', ParentId: null,
        });
    });

    const build: BuildResult = {
        id: 42, result: 'succeeded', sourceBranch: 'refs/heads/main',
        definition: { id: 0, name: 'CI' }, requestedFor: { uniqueName: 'builder@example.test' },
        tags: ['ci', 'release'], templateParameters: { configuration: 'Release' },
    };
    testPayloadFidelity('Azure DevOps build results and definitions', connectors.vsts.onBuildCompleted, 'builds', [build, {}], (context) => {
        assert.strictEqual(context.builds[0]?.definition?.id, 0);
        assert.deepStrictEqual(context.builds[0]?.templateParameters, { configuration: 'Release' });
        assert.strictEqual(context.builds[0]?.requestedFor?.uniqueName, 'builder@example.test');
    });

    const pullRequest: GitPullRequest = {
        pullRequestId: 7, title: 'Review', isDraft: false,
        sourceRefName: 'refs/heads/feature', targetRefName: 'refs/heads/main',
        repository: { id: 'repository-1', name: 'repository' },
    };
    testPayloadFidelity('Azure DevOps pull request branches and repository', connectors.vsts.onGitPullCreated, 'pullRequests', [pullRequest, {}], (context) => {
        assert.strictEqual(context.pullRequests[0]?.isDraft, false);
        assert.strictEqual(context.pullRequests[0]?.sourceRefName, 'refs/heads/feature');
        assert.strictEqual(context.pullRequests[0]?.repository?.id, 'repository-1');
    });

    const push: GitPush = {
        pushId: 8, repository: { id: 'repository-1' },
        pushedBy: { id: 'user-1', displayName: 'Contributor' },
        refUpdates: [{ name: 'refs/heads/main', oldObjectId: 'previous', newObjectId: 'current' }],
    };
    testPayloadFidelity('Azure DevOps Git push ref updates', connectors.vsts.onGitPush, 'pushes', [push, {}], (context) => {
        assert.strictEqual(context.pushes[0]?.pushedBy?.displayName, 'Contributor');
        assert.deepStrictEqual(context.pushes[0]?.refUpdates, [
            { name: 'refs/heads/main', oldObjectId: 'previous', newObjectId: 'current' },
        ]);
    });

    const changeset: TfvcChangeset = {
        changesetId: 9, comment: '',
        author: { displayName: 'Author', uniqueName: 'author@example.test' },
        checkedInBy: { displayName: 'Reviewer' },
    };
    testPayloadFidelity('Azure DevOps TFVC authors and check-in metadata', connectors.vsts.onTfvcCheckIn, 'changesets', [changeset, {}], (context) => {
        assert.strictEqual(context.changesets[0]?.comment, '');
        assert.strictEqual(context.changesets[0]?.author?.uniqueName, 'author@example.test');
        assert.strictEqual(context.changesets[0]?.checkedInBy?.displayName, 'Reviewer');
    });

    const workItem: TriggerWorkItemResponse = {
        id: 10, rev: 0, fields: {
            'System.Title': 'Investigate', 'Custom.IsBlocked': false,
            'Custom.Estimate': 0, 'Custom.Owner': null, 'Custom.Tags': ['triage', 'sdk'],
        },
    };
    testPayloadFidelity('Azure DevOps work item dynamic field names and values', connectors.vsts.onWorkItemUpdated, 'workItems', [workItem, {}], (context) => {
        assert.strictEqual(context.workItems[0]?.rev, 0);
        assert.deepStrictEqual(context.workItems[0]?.fields, {
            'System.Title': 'Investigate', 'Custom.IsBlocked': false,
            'Custom.Estimate': 0, 'Custom.Owner': null, 'Custom.Tags': ['triage', 'sdk'],
        });
    });

    const refresh: RefreshModel = {
        dataflowId: 'dataflow-1', dataflowName: 'Daily refresh', refreshType: 'Scheduled',
        startTime: '2026-10-28T10:00:00Z', endTime: '2026-10-28T10:05:00Z', status: 'Failed',
    };
    testPayloadFidelity('Dataflows refresh status and timestamps', connectors.dataflows.onRefreshComplete, 'refreshes', [refresh, {}], (context) => {
        assert.strictEqual(context.refreshes[0]?.status, 'Failed');
        assert.strictEqual(context.refreshes[0]?.startTime, '2026-10-28T10:00:00Z');
        assert.strictEqual(context.refreshes[0]?.endTime, '2026-10-28T10:05:00Z');
    });
});
