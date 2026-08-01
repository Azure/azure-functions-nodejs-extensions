// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as azureFunctions from '@azure/functions';
import { onUpdatedFile as onAzureBlobUpdatedFile } from '../src/connectors/azureblobTriggers';
import { onQueryResult } from '../src/connectors/kustoTriggers';
import {
    onFlaggedEmail,
    onNewCalendarEvent,
    onNewEmail,
    onNewMentionMeEmail,
    onUpcomingEvent,
} from '../src/connectors/office365Triggers';
import {
    onNewFile as onOneDriveNewFile,
    onUpdatedFile as onOneDriveUpdatedFile,
} from '../src/connectors/onedriveTriggers';
import { onNewFile, onUpdatedFile } from '../src/connectors/sharepointTriggers';
import {
    onGroupMembershipAdd,
    onGroupMembershipRemoval,
    onNewChannelMessage,
    onNewChannelMessageMentioningMe,
} from '../src/connectors/teamsTriggers';

describe('connector-specific triggers', () => {
    let appStub: sinon.SinonStub;

    beforeEach(() => {
        appStub = sinon.stub(azureFunctions.app, 'connectorTrigger');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('kusto', () => {
        it('onQueryResult should register with the correct function name', () => {
            onQueryResult('testQuery', {
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            assert.strictEqual(appStub.firstCall.args[0], 'testQuery');
        });
    });

    describe('azureblob', () => {
        it('onUpdatedFile should register with the correct function name', () => {
            onAzureBlobUpdatedFile('testAzureBlobUpdated', {
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            assert.strictEqual(appStub.firstCall.args[0], 'testAzureBlobUpdated');
        });
    });

    describe('office365', () => {
        it('onFlaggedEmail should register with the correct function name', () => {
            onFlaggedEmail('testFlagged', {
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            assert.strictEqual(appStub.firstCall.args[0], 'testFlagged');
        });

        it('onNewCalendarEvent should register with the correct function name', () => {
            onNewCalendarEvent('testCalendar', {
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            assert.strictEqual(appStub.firstCall.args[0], 'testCalendar');
        });

        it('onNewEmail should register with the correct function name', () => {
            onNewEmail('testEmail', {
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            assert.strictEqual(appStub.firstCall.args[0], 'testEmail');
        });

        it('onNewMentionMeEmail should register with the correct function name', () => {
            onNewMentionMeEmail('testMentionMe', {
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            assert.strictEqual(appStub.firstCall.args[0], 'testMentionMe');
        });

        it('onUpcomingEvent should register with the correct function name', () => {
            onUpcomingEvent('testUpcoming', {
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            assert.strictEqual(appStub.firstCall.args[0], 'testUpcoming');
        });
    });

    describe('onedrive', () => {
        it('onNewFile should register with the correct function name', () => {
            onOneDriveNewFile('testOneDriveNew', {
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            assert.strictEqual(appStub.firstCall.args[0], 'testOneDriveNew');
        });

        it('onUpdatedFile should register with the correct function name', () => {
            onOneDriveUpdatedFile('testOneDriveUpdated', {
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            assert.strictEqual(appStub.firstCall.args[0], 'testOneDriveUpdated');
        });
    });

    describe('sharepoint', () => {
        it('onNewFile should register with the correct function name', () => {
            onNewFile('testNewFile', {
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            assert.strictEqual(appStub.firstCall.args[0], 'testNewFile');
        });

        it('onUpdatedFile should register with the correct function name', () => {
            onUpdatedFile('testUpdatedFile', {
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            assert.strictEqual(appStub.firstCall.args[0], 'testUpdatedFile');
        });
    });

    describe('teams', () => {
        it('onNewChannelMessage should register with the correct function name', () => {
            onNewChannelMessage('testMessage', {
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            assert.strictEqual(appStub.firstCall.args[0], 'testMessage');
        });

        it('onNewChannelMessageMentioningMe should register with the correct function name', () => {
            onNewChannelMessageMentioningMe('testMentionMessage', {
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            assert.strictEqual(appStub.firstCall.args[0], 'testMentionMessage');
        });

        it('onGroupMembershipAdd should register with the correct function name', () => {
            onGroupMembershipAdd('testMemberAdd', {
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            assert.strictEqual(appStub.firstCall.args[0], 'testMemberAdd');
        });

        it('onGroupMembershipRemoval should register with the correct function name', () => {
            onGroupMembershipRemoval('testMemberRemove', {
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            assert.strictEqual(appStub.firstCall.args[0], 'testMemberRemove');
        });
    });

    describe('extra bindings passthrough', () => {
        it('should pass extraInputs and extraOutputs through to app.connectorTrigger', () => {
            const mockInput = { name: 'input1', type: 'connectorContent' } as unknown as azureFunctions.FunctionInput;
            const mockOutput = { name: 'output1', type: 'connectorContent' } as unknown as azureFunctions.FunctionOutput;

            onNewEmail('testWithBindings', {
                extraInputs: [mockInput],
                extraOutputs: [mockOutput],
                handler: async () => undefined,
            });

            const registeredOptions = appStub.firstCall.args[1];
            assert.deepStrictEqual(registeredOptions.extraInputs, [mockInput]);
            assert.deepStrictEqual(registeredOptions.extraOutputs, [mockOutput]);
        });

        it('should pass return output binding through', () => {
            const mockReturn = { name: 'returnOutput', type: 'http' } as unknown as azureFunctions.FunctionOutput;

            onNewFile('testWithReturn', {
                return: mockReturn,
                handler: async () => undefined,
            });

            const registeredOptions = appStub.firstCall.args[1];
            assert.strictEqual(registeredOptions.return, mockReturn);
        });
    });

    describe('named context properties', () => {
        const batchPayload = JSON.stringify({
            body: { value: [{ id: '1' }, { id: '2' }] },
        });
        const mockInvocationContext = {} as azureFunctions.InvocationContext;

        it('onNewEmail handler should receive context with emails alias', async () => {
            let receivedEmails: unknown[] | undefined;

            onNewEmail('emailAlias', {
                handler: async (context) => {
                    receivedEmails = context.emails;
                    assert.deepStrictEqual(context.emails, context.items);
                },
            });

            const registeredHandler = appStub.firstCall.args[1].handler;
            await registeredHandler(batchPayload, mockInvocationContext);

            assert.ok(receivedEmails);
            assert.strictEqual(receivedEmails.length, 2);
        });

        it('onNewCalendarEvent handler should receive context with calendarEvents alias', async () => {
            let receivedEvents: unknown[] | undefined;

            onNewCalendarEvent('calendarAlias', {
                handler: async (context) => {
                    receivedEvents = context.calendarEvents;
                    assert.deepStrictEqual(context.calendarEvents, context.items);
                },
            });

            const registeredHandler = appStub.firstCall.args[1].handler;
            await registeredHandler(batchPayload, mockInvocationContext);

            assert.ok(receivedEvents);
            assert.strictEqual(receivedEvents.length, 2);
        });

        it('onNewFile handler should receive context with files alias', async () => {
            let receivedFiles: unknown[] | undefined;

            onNewFile('fileAlias', {
                handler: async (context) => {
                    receivedFiles = context.files;
                    assert.deepStrictEqual(context.files, context.items);
                },
            });

            const registeredHandler = appStub.firstCall.args[1].handler;
            await registeredHandler(batchPayload, mockInvocationContext);

            assert.ok(receivedFiles);
            assert.strictEqual(receivedFiles.length, 2);
        });

        it('onUpdatedFile handler should receive context with files alias', async () => {
            let receivedFiles: unknown[] | undefined;

            onUpdatedFile('updatedFileAlias', {
                handler: async (context) => {
                    receivedFiles = context.files;
                    assert.deepStrictEqual(context.files, context.items);
                },
            });

            const registeredHandler = appStub.firstCall.args[1].handler;
            await registeredHandler(batchPayload, mockInvocationContext);

            assert.ok(receivedFiles);
            assert.strictEqual(receivedFiles.length, 2);
        });

        it('onNewChannelMessage handler should receive context with messages alias', async () => {
            let receivedMessages: unknown[] | undefined;

            onNewChannelMessage('messageAlias', {
                handler: async (context) => {
                    receivedMessages = context.messages;
                    assert.deepStrictEqual(context.messages, context.items);
                },
            });

            const registeredHandler = appStub.firstCall.args[1].handler;
            await registeredHandler(batchPayload, mockInvocationContext);

            assert.ok(receivedMessages);
            assert.strictEqual(receivedMessages.length, 2);
        });

        it('onQueryResult handler should receive context with rows alias', async () => {
            let receivedRows: unknown[] | undefined;

            onQueryResult('rowsAlias', {
                handler: async (context) => {
                    receivedRows = context.rows;
                    assert.deepStrictEqual(context.rows, context.items);
                },
            });

            const registeredHandler = appStub.firstCall.args[1].handler;
            await registeredHandler(batchPayload, mockInvocationContext);

            assert.ok(receivedRows);
            assert.strictEqual(receivedRows.length, 2);
        });
    });
});
