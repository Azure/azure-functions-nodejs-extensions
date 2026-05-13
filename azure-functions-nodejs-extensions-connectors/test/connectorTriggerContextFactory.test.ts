// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as assert from 'assert';
import { ConnectorTriggerContextFactory } from '../src/connectors/connectorTriggerContextFactory';
import { ModelBindingData } from '@azure/functions-extensions-base';

describe('ConnectorTriggerContextFactory', () => {
    describe('buildFromModelBindingData', () => {
        it('should parse string content into a ConnectorTriggerContext', () => {
            const payload = {
                body: {
                    value: [{ id: '1', subject: 'Test Email' }],
                },
            };

            const modelBindingData = {
                content: JSON.stringify(payload),
            } as unknown as ModelBindingData;

            const context = ConnectorTriggerContextFactory.buildFromModelBindingData(modelBindingData);

            assert.strictEqual(context.items.length, 1);
            assert.deepStrictEqual(context.items[0], { id: '1', subject: 'Test Email' });
            assert.deepStrictEqual(context.payload, payload);
        });

        it('should parse Buffer content into a ConnectorTriggerContext', () => {
            const payload = {
                body: {
                    value: [{ id: '1', subject: 'Buffer Email' }],
                },
            };

            const modelBindingData: ModelBindingData = {
                content: Buffer.from(JSON.stringify(payload)),
            } as ModelBindingData;

            const context = ConnectorTriggerContextFactory.buildFromModelBindingData(modelBindingData);

            assert.strictEqual(context.items.length, 1);
            assert.deepStrictEqual(context.items[0], { id: '1', subject: 'Buffer Email' });
        });

        it('should parse Uint8Array content into a ConnectorTriggerContext', () => {
            const payload = {
                body: {
                    value: [{ id: '1', subject: 'Uint8Array Email' }],
                },
            };

            const encoded = new TextEncoder().encode(JSON.stringify(payload));
            const modelBindingData: ModelBindingData = {
                content: encoded,
            } as ModelBindingData;

            const context = ConnectorTriggerContextFactory.buildFromModelBindingData(modelBindingData);

            assert.strictEqual(context.items.length, 1);
            assert.deepStrictEqual(context.items[0], { id: '1', subject: 'Uint8Array Email' });
        });

        it('should handle object content directly', () => {
            const payload = {
                body: {
                    value: [{ id: '1', subject: 'Object Email' }],
                },
            };

            const modelBindingData = {
                content: payload,
            } as unknown as ModelBindingData;

            const context = ConnectorTriggerContextFactory.buildFromModelBindingData(modelBindingData);

            assert.strictEqual(context.items.length, 1);
            assert.deepStrictEqual(context.items[0], { id: '1', subject: 'Object Email' });
        });

        it('should return empty context for null ModelBindingData', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const context = ConnectorTriggerContextFactory.buildFromModelBindingData(null as any);

            assert.strictEqual(context.items.length, 0);
            assert.deepStrictEqual(context.payload, { body: { value: [] } });
        });

        it('should return empty context for undefined ModelBindingData', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const context = ConnectorTriggerContextFactory.buildFromModelBindingData(undefined as any);

            assert.strictEqual(context.items.length, 0);
            assert.deepStrictEqual(context.payload, { body: { value: [] } });
        });

        it('should return empty context for array with no elements', () => {
            const context = ConnectorTriggerContextFactory.buildFromModelBindingData([]);

            assert.strictEqual(context.items.length, 0);
            assert.deepStrictEqual(context.payload, { body: { value: [] } });
        });

        it('should use first element from array of ModelBindingData', () => {
            const payload = {
                body: {
                    value: [{ id: '1', subject: 'First Item' }],
                },
            };

            const modelBindingDataArray: ModelBindingData[] = [
                { content: JSON.stringify(payload) } as unknown as ModelBindingData,
                { content: JSON.stringify({ body: { value: [{ id: '2' }] } }) } as unknown as ModelBindingData,
            ];

            const context = ConnectorTriggerContextFactory.buildFromModelBindingData(modelBindingDataArray);

            assert.strictEqual(context.items.length, 1);
            assert.deepStrictEqual(context.items[0], { id: '1', subject: 'First Item' });
        });

        it('should handle invalid JSON content gracefully', () => {
            const modelBindingData = {
                content: 'not valid json',
            } as unknown as ModelBindingData;

            const context = ConnectorTriggerContextFactory.buildFromModelBindingData(modelBindingData);

            assert.strictEqual(context.items.length, 0);
            assert.deepStrictEqual(context.payload, { body: { value: [] } });
        });

        it('should handle payload without body.value gracefully', () => {
            const modelBindingData = {
                content: JSON.stringify({ someOtherField: 'data' }),
            } as unknown as ModelBindingData;

            const context = ConnectorTriggerContextFactory.buildFromModelBindingData(modelBindingData);

            assert.strictEqual(context.items.length, 0);
        });

        it('should provide a toJSON method that serializes the payload', () => {
            const payload = {
                body: {
                    value: [{ id: '1' }],
                },
            };

            const modelBindingData = {
                content: JSON.stringify(payload),
            } as unknown as ModelBindingData;

            const context = ConnectorTriggerContextFactory.buildFromModelBindingData(modelBindingData);
            const serialized = context.toJSON();

            assert.strictEqual(serialized, JSON.stringify(payload));
        });
    });
});
