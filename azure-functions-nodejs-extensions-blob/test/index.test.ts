// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { StorageBlobClientFactory, StorageBlobClientFactoryResolver } from '@azure/functions';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { CacheableAzureStorageBlobClientFactory } from '../src/storage-blob/cacheableStorageBlobClientFactory';

describe('Storage Blob Extension Registration', () => {
    // Save original console methods to restore later
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    let consoleLogStub: sinon.SinonStub;
    let resolverStub: sinon.SinonStubbedInstance<StorageBlobClientFactoryResolver>;
    let hasFactoryStub: sinon.SinonStub;
    let registerFactoryStub: sinon.SinonStub;
    let buildClientStub: sinon.SinonStub;

    beforeEach(() => {
        // Stub console methods to prevent output during tests
        consoleLogStub = sinon.stub(console, 'log');

        // Reset module cache to ensure fresh import
        delete require.cache[require.resolve('../src/index')];

        // Create stubs for the resolver
        resolverStub = sinon.createStubInstance(StorageBlobClientFactoryResolver);
        hasFactoryStub = sinon.stub();
        registerFactoryStub = sinon.stub<[StorageBlobClientFactory], void>();

        resolverStub.hasFactory = hasFactoryStub as sinon.SinonStub<[], boolean>;
        resolverStub.registerFactory = registerFactoryStub as sinon.SinonStub<[StorageBlobClientFactory], void>;

        // Stub the getInstance method
        sinon
            .stub(StorageBlobClientFactoryResolver, 'getInstance')
            .returns(resolverStub as unknown as StorageBlobClientFactoryResolver);

        // Stub the static method in CacheableAzureStorageBlobClientFactory
        buildClientStub = sinon.stub(CacheableAzureStorageBlobClientFactory, 'buildClientFromModelBindingData');
    });

    afterEach(() => {
        // Restore all stubbed methods
        sinon.restore();
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
    });

    // eslint-disable-next-line @typescript-eslint/require-await
    it('should register a blob client factory when none exists', async () => {
        // Setup
        hasFactoryStub.returns(false);
        buildClientStub.returns({} as any);

        // Execute
        require('../src/index');

        // Verify
        expect(hasFactoryStub.calledOnce).to.be.true;
        expect(registerFactoryStub.calledOnce).to.be.true;
    });

    it('should skip registration when a factory is already registered', () => {
        // Setup
        hasFactoryStub.returns(true);

        // Execute
        require('../src/index');

        // Verify
        expect(hasFactoryStub.calledOnce).to.be.true;
        expect(registerFactoryStub.called).to.be.false;
        expect(consoleLogStub.calledWith('A blob client factory is already registered, skipping registration')).to.be
            .true;
    });

    it('should throw error when factory registration fails', () => {
        // Setup
        hasFactoryStub.returns(false);
        registerFactoryStub.throws(new Error('Registration failed'));

        // Verify
        try {
            require('../src/index');
            expect.fail('Should have thrown an error');
        } catch (error) {
            expect(error).to.be.instanceOf(Error);
            expect((error as Error).message).to.include('Custom blob client initialization failed');
        }
    });

    it('should correctly pass options to the client factory', () => {
        // Setup
        hasFactoryStub.returns(false);
        buildClientStub.returns({} as any);

        // Execute
        require('../src/index');

        // Get the factory function that was registered
        const factoryFn = registerFactoryStub.args[0]?.[0];
        if (!factoryFn) {
            throw new Error('Factory function is undefined');
        }

        // Create a mock options object
        const testOptions = {
            connection: 'test-connection',
            containerName: 'test-container',
        };

        // Call the factory function with the options
        factoryFn(testOptions);

        // Verify that buildClientFromModelBindingData was called with the right options
        expect(buildClientStub.calledWith(testOptions)).to.be.true;
    });
});
