// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as azureFunctions from '@azure/functions';
import { connectorContent } from '../src/connectors/connectorContent';

describe('connectorContent', () => {
    let inputStub: sinon.SinonStub;
    let outputStub: sinon.SinonStub;

    beforeEach(() => {
        inputStub = sinon.stub(azureFunctions.input, 'connectorContent').callsFake((options) => ({
            ...options,
            name: 'testInputBinding',
            type: 'connectorContent',
        }));

        outputStub = sinon.stub(azureFunctions.output, 'connectorContent').callsFake((options) => ({
            ...options,
            name: 'testOutputBinding',
            type: 'connectorContent',
        }));
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('input', () => {
        it('should create an input binding with connector, connection, and operation', () => {
            const result = connectorContent.input({
                connector: 'office365',
                connection: 'Office365Connection',
                operation: 'GetEmail',
            });

            assert.strictEqual(inputStub.calledOnce, true);
            assert.strictEqual(result.name, 'testInputBinding');

            const passedOptions = inputStub.firstCall.args[0];
            assert.strictEqual(passedOptions.connector, 'office365');
            assert.strictEqual(passedOptions.connection, 'Office365Connection');
            assert.strictEqual(passedOptions.operation, 'GetEmail');
        });

        it('should allow optional operation', () => {
            connectorContent.input({
                connector: 'sharepointonline',
                connection: 'SharePointConnection',
            });

            const passedOptions = inputStub.firstCall.args[0];
            assert.strictEqual(passedOptions.connector, 'sharepointonline');
            assert.strictEqual(passedOptions.connection, 'SharePointConnection');
            assert.strictEqual(passedOptions.operation, undefined);
        });
    });

    describe('output', () => {
        it('should create an output binding with connector, connection, and operation', () => {
            const result = connectorContent.output({
                connector: 'office365',
                connection: 'Office365Connection',
                operation: 'SendEmail',
            });

            assert.strictEqual(outputStub.calledOnce, true);
            assert.strictEqual(result.name, 'testOutputBinding');

            const passedOptions = outputStub.firstCall.args[0];
            assert.strictEqual(passedOptions.connector, 'office365');
            assert.strictEqual(passedOptions.connection, 'Office365Connection');
            assert.strictEqual(passedOptions.operation, 'SendEmail');
        });

        it('should allow optional operation', () => {
            connectorContent.output({
                connector: 'teams',
                connection: 'TeamsConnection',
            });

            const passedOptions = outputStub.firstCall.args[0];
            assert.strictEqual(passedOptions.connector, 'teams');
            assert.strictEqual(passedOptions.connection, 'TeamsConnection');
            assert.strictEqual(passedOptions.operation, undefined);
        });
    });
});
