// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ModelBindingData, ResourceFactoryResolver } from '@azure/functions-extensions-base';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { CacheableAzureStorageBlobClientFactory } from '../../src/storage-blob/cacheableStorageBlobClientFactory';
import { registerStorageBlobClientFactory } from '../../src/storage-blob/registerStorageBlobClientFactory';
import { StorageBlobClient } from '../../src/storage-blob/storageBlobClient';

describe('registerStorageBlobClientFactory', () => {
    // Stubs for dependencies
    let resolverStub: sinon.SinonStubbedInstance<ResourceFactoryResolver>;
    let hasResourceFactoryStub: sinon.SinonStub;
    let registerResourceFactoryStub: sinon.SinonStub;
    let buildClientStub: sinon.SinonStub;
    let mockStorageBlobClient: StorageBlobClient;

    // Sample model binding data for testing
    const sampleModelBindingData: ModelBindingData = {
        content: Buffer.from(
            JSON.stringify({
                Connection: 'TestConnection',
                ContainerName: 'test-container',
                BlobName: 'test-blob',
            })
        ),
        contentType: 'application/json',
        source: 'test-source',
        version: '1.0',
    };

    beforeEach(() => {
        // Create mock client
        mockStorageBlobClient = {
            getBlobClient: sinon.stub(),
            getContainerClient: sinon.stub(),
            dispose: sinon.stub(),
        } as unknown as StorageBlobClient;

        // Set up stubs
        resolverStub = {
            hasResourceFactory: sinon.stub(),
            registerResourceFactory: sinon.stub(),
        } as unknown as sinon.SinonStubbedInstance<ResourceFactoryResolver>;

        // Extract the stubs for easier reference
        // eslint-disable-next-line @typescript-eslint/unbound-method
        hasResourceFactoryStub = resolverStub.hasResourceFactory as sinon.SinonStub;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        registerResourceFactoryStub = resolverStub.registerResourceFactory as sinon.SinonStub;

        // Stub the static method
        sinon.stub(ResourceFactoryResolver, 'getInstance').returns(resolverStub as unknown as ResourceFactoryResolver);

        // Stub CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData
        buildClientStub = sinon
            .stub(CacheableAzureStorageBlobClientFactory, 'buildClientFromModelBindingData')
            .returns(mockStorageBlobClient);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should register a blob client factory when none exists', () => {
        // Arrange
        hasResourceFactoryStub.returns(false);

        // Act
        registerStorageBlobClientFactory();

        // Assert
        expect(hasResourceFactoryStub.calledOnceWith('AzureStorageBlobs')).to.be.true;
        expect(registerResourceFactoryStub.calledOnce).to.be.true;
        expect(registerResourceFactoryStub.firstCall.args[0]).to.equal('AzureStorageBlobs');

        // Verify the factory function
        const factoryFn = registerResourceFactoryStub.firstCall.args[1];
        expect(typeof factoryFn).to.equal('function');

        // Call the factory function to verify it passes through to buildClientFromModelBindingData
        factoryFn(sampleModelBindingData);
        expect(buildClientStub.calledOnceWith(sampleModelBindingData)).to.be.true;
    });

    it('should skip registration when a factory is already registered', () => {
        // Arrange
        hasResourceFactoryStub.returns(true);

        // Act
        registerStorageBlobClientFactory();

        // Assert
        expect(hasResourceFactoryStub.calledOnceWith('AzureStorageBlobs')).to.be.true;
        expect(registerResourceFactoryStub.called).to.be.false;
    });

    it('should propagate and enhance errors from ResourceFactoryResolver', () => {
        // Arrange
        hasResourceFactoryStub.throws(new Error('Resource resolver error'));

        // Act & Assert
        try {
            registerStorageBlobClientFactory();
            expect.fail('Should have thrown an error');
        } catch (error) {
            const err = error as Error;
            expect(err.message).to.include('Blob client initialization failed');
            expect(err.message).to.include('Resource resolver error');
        }
    });

    it('should propagate and handle non-Error exceptions', () => {
        // Arrange
        hasResourceFactoryStub.throws('String exception');

        // Act & Assert
        try {
            registerStorageBlobClientFactory();
            expect.fail('Should have thrown an error');
        } catch (error) {
            const err = error as Error;
            expect(err.message).to.include('Blob client initialization failed');
            expect(err.message).to.include('String exception');
        }
    });

    it('should correctly register factory that creates client instances', () => {
        // Arrange
        hasResourceFactoryStub.returns(false);

        // Act
        registerStorageBlobClientFactory();

        // Get the registered factory function
        const factoryFn = registerResourceFactoryStub.firstCall.args[1];

        // Call the factory function with model binding data
        const resultClient = factoryFn(sampleModelBindingData);

        // Assert
        expect(resultClient).to.equal(mockStorageBlobClient);
        expect(buildClientStub.calledOnceWith(sampleModelBindingData)).to.be.true;
    });
});
