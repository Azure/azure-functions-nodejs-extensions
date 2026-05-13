// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as azureFunctions from '@azure/functions';
import { connectorTrigger } from '../src/connectors/connectorTrigger';

describe('connectorTrigger', () => {
    let appStub: sinon.SinonStub;

    beforeEach(() => {
        appStub = sinon.stub(azureFunctions.app, 'connectorTrigger');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should call app.connectorTrigger with the correct name', () => {
        connectorTrigger('testFunction', {
            connection: 'TestConnection',
            connector: 'office365',
            triggerOperation: 'OnNewEmail',
            handler: async () => undefined,
        });

        assert.strictEqual(appStub.calledOnce, true);
        assert.strictEqual(appStub.firstCall.args[0], 'testFunction');
    });

    it('should pass connection, connector, and triggerOperation to app.connectorTrigger', () => {
        connectorTrigger('testFunction', {
            connection: 'Office365Connection',
            connector: 'office365',
            triggerOperation: 'OnNewEmail',
            handler: async () => undefined,
        });

        const registeredOptions = appStub.firstCall.args[1];
        assert.strictEqual(registeredOptions.connection, 'Office365Connection');
        assert.strictEqual(registeredOptions.connector, 'office365');
        assert.strictEqual(registeredOptions.triggerOperation, 'OnNewEmail');
    });

    it('should pass extraInputs and extraOutputs through', () => {
        const mockInput = { name: 'testInput', type: 'connectorContent' } as unknown as azureFunctions.FunctionInput;
        const mockOutput = { name: 'testOutput', type: 'connectorContent' } as unknown as azureFunctions.FunctionOutput;

        connectorTrigger('testFunction', {
            connection: 'TestConnection',
            connector: 'office365',
            triggerOperation: 'OnNewEmail',
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

        connectorTrigger('testFunction', {
            connection: 'TestConnection',
            connector: 'office365',
            triggerOperation: 'OnNewEmail',
            return: mockReturn,
            handler: async () => undefined,
        });

        const registeredOptions = appStub.firstCall.args[1];
        assert.strictEqual(registeredOptions.return, mockReturn);
    });

    describe('handler wrapper (payload normalization)', () => {
        it('should normalize batch payload with body.value array', async () => {
            let capturedContext: unknown;
            connectorTrigger('testFunction', {
                connection: 'TestConnection',
                connector: 'office365',
                triggerOperation: 'OnNewEmail',
                handler: async (context) => {
                    capturedContext = context;
                },
            });

            const wrappedHandler = appStub.firstCall.args[1].handler;
            const batchPayload = {
                body: {
                    value: [
                        { id: '1', subject: 'Email 1' },
                        { id: '2', subject: 'Email 2' },
                    ],
                },
            };

            const mockInvocationContext = {} as azureFunctions.InvocationContext;
            await wrappedHandler(batchPayload, mockInvocationContext);

            const context = capturedContext as { items: unknown[]; payload: unknown; rawPayload: unknown };
            assert.strictEqual(context.items.length, 2);
            assert.deepStrictEqual(context.items[0], { id: '1', subject: 'Email 1' });
            assert.deepStrictEqual(context.items[1], { id: '2', subject: 'Email 2' });
        });

        it('should normalize single-item payload where body is the item', async () => {
            let capturedContext: unknown;
            connectorTrigger('testFunction', {
                connection: 'TestConnection',
                connector: 'office365',
                triggerOperation: 'OnNewEmail',
                handler: async (context) => {
                    capturedContext = context;
                },
            });

            const wrappedHandler = appStub.firstCall.args[1].handler;
            const singleItemPayload = {
                body: { id: '1', subject: 'Single Email' },
            };

            const mockInvocationContext = {} as azureFunctions.InvocationContext;
            await wrappedHandler(singleItemPayload, mockInvocationContext);

            const context = capturedContext as { items: unknown[] };
            assert.strictEqual(context.items.length, 1);
            assert.deepStrictEqual(context.items[0], { id: '1', subject: 'Single Email' });
        });

        it('should normalize string payload by parsing JSON', async () => {
            let capturedContext: unknown;
            connectorTrigger('testFunction', {
                connection: 'TestConnection',
                connector: 'office365',
                triggerOperation: 'OnNewEmail',
                handler: async (context) => {
                    capturedContext = context;
                },
            });

            const wrappedHandler = appStub.firstCall.args[1].handler;
            const stringPayload = JSON.stringify({
                body: {
                    value: [{ id: '1', subject: 'Parsed Email' }],
                },
            });

            const mockInvocationContext = {} as azureFunctions.InvocationContext;
            await wrappedHandler(stringPayload, mockInvocationContext);

            const context = capturedContext as { items: unknown[] };
            assert.strictEqual(context.items.length, 1);
            assert.deepStrictEqual(context.items[0], { id: '1', subject: 'Parsed Email' });
        });

        it('should return empty items for null payload', async () => {
            let capturedContext: unknown;
            connectorTrigger('testFunction', {
                connection: 'TestConnection',
                connector: 'office365',
                triggerOperation: 'OnNewEmail',
                handler: async (context) => {
                    capturedContext = context;
                },
            });

            const wrappedHandler = appStub.firstCall.args[1].handler;
            const mockInvocationContext = {} as azureFunctions.InvocationContext;
            await wrappedHandler(null, mockInvocationContext);

            const context = capturedContext as { items: unknown[] };
            assert.strictEqual(context.items.length, 0);
        });

        it('should return empty items for undefined payload', async () => {
            let capturedContext: unknown;
            connectorTrigger('testFunction', {
                connection: 'TestConnection',
                connector: 'office365',
                triggerOperation: 'OnNewEmail',
                handler: async (context) => {
                    capturedContext = context;
                },
            });

            const wrappedHandler = appStub.firstCall.args[1].handler;
            const mockInvocationContext = {} as azureFunctions.InvocationContext;
            await wrappedHandler(undefined, mockInvocationContext);

            const context = capturedContext as { items: unknown[] };
            assert.strictEqual(context.items.length, 0);
        });

        it('should return empty items for payload with empty body', async () => {
            let capturedContext: unknown;
            connectorTrigger('testFunction', {
                connection: 'TestConnection',
                connector: 'office365',
                triggerOperation: 'OnNewEmail',
                handler: async (context) => {
                    capturedContext = context;
                },
            });

            const wrappedHandler = appStub.firstCall.args[1].handler;
            const mockInvocationContext = {} as azureFunctions.InvocationContext;
            await wrappedHandler({ body: {} }, mockInvocationContext);

            const context = capturedContext as { items: unknown[] };
            assert.strictEqual(context.items.length, 0);
        });

        it('should set rawPayload to the original parsed payload', async () => {
            let capturedContext: unknown;
            connectorTrigger('testFunction', {
                connection: 'TestConnection',
                connector: 'office365',
                triggerOperation: 'OnNewEmail',
                handler: async (context) => {
                    capturedContext = context;
                },
            });

            const wrappedHandler = appStub.firstCall.args[1].handler;
            const originalPayload = {
                body: { value: [{ id: '1' }] },
                metadata: { source: 'test' },
            };

            const mockInvocationContext = {} as azureFunctions.InvocationContext;
            await wrappedHandler(originalPayload, mockInvocationContext);

            const context = capturedContext as { rawPayload: unknown };
            assert.deepStrictEqual(context.rawPayload, originalPayload);
        });

        it('should provide a toJSON method that serializes rawPayload', async () => {
            let capturedContext: unknown;
            connectorTrigger('testFunction', {
                connection: 'TestConnection',
                connector: 'office365',
                triggerOperation: 'OnNewEmail',
                handler: async (context) => {
                    capturedContext = context;
                },
            });

            const wrappedHandler = appStub.firstCall.args[1].handler;
            const originalPayload = { body: { value: [{ id: '1' }] } };

            const mockInvocationContext = {} as azureFunctions.InvocationContext;
            await wrappedHandler(originalPayload, mockInvocationContext);

            const context = capturedContext as { toJSON(): string };
            assert.strictEqual(context.toJSON(), JSON.stringify(originalPayload));
        });

        it('should normalize payload.body.value into a TriggerCallbackPayload shape', async () => {
            let capturedContext: unknown;
            connectorTrigger('testFunction', {
                connection: 'TestConnection',
                connector: 'office365',
                triggerOperation: 'OnNewEmail',
                handler: async (context) => {
                    capturedContext = context;
                },
            });

            const wrappedHandler = appStub.firstCall.args[1].handler;
            const batchPayload = {
                body: {
                    value: [{ id: '1' }, { id: '2' }],
                },
            };

            const mockInvocationContext = {} as azureFunctions.InvocationContext;
            await wrappedHandler(batchPayload, mockInvocationContext);

            const context = capturedContext as { payload: { body: { value: unknown[] } } };
            assert.deepStrictEqual(context.payload, {
                body: { value: [{ id: '1' }, { id: '2' }] },
            });
        });

        it('should return the handler result back to the host', async () => {
            connectorTrigger('testFunction', {
                connection: 'TestConnection',
                connector: 'office365',
                triggerOperation: 'OnNewEmail',
                handler: async (context) => {
                    return context.rawPayload;
                },
            });

            const wrappedHandler = appStub.firstCall.args[1].handler;
            const payload = { body: { value: [{ id: '1' }] } };
            const mockInvocationContext = {} as azureFunctions.InvocationContext;
            const result = await wrappedHandler(payload, mockInvocationContext);

            assert.deepStrictEqual(result, payload);
        });
    });
});
