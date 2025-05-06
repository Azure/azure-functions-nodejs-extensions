// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { StorageBlobClientOptions } from '@azure/functions';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { CacheableAzureStorageBlobClientFactory } from '../../src/storage-blob/cacheableStorageBlobClientFactory';
import { StorageBlobClient } from '../../src/storage-blob/storageBlobClient';
import { StorageBlobServiceClientStrategy } from '../../src/storage-blob/storageBlobServiceClientStrategy';
import * as utils from '../../src/storage-blob/utils';

describe('CacheableAzureStorageBlobClientFactory', () => {
    // Mocks
    let mockStorageBlobClient: StorageBlobClient;
    let mockStrategy: StorageBlobServiceClientStrategy;
    let fromConnectionDetailsStub: sinon.SinonStub;
    let clock: sinon.SinonFakeTimers;

    const testOptions: StorageBlobClientOptions = {
        connection: 'TestConnection',
        containerName: 'test-container',
        blobName: 'test-blob',
    };

    beforeEach(() => {
        // Create a fresh sandbox for each test
        clock = sinon.useFakeTimers();

        // Setup mocks
        mockStorageBlobClient = {
            getBlobClient: sinon.stub(),
            getContainerClient: sinon.stub(),
            dispose: sinon.stub() as sinon.SinonStub,
        } as unknown as StorageBlobClient;

        mockStrategy = {
            createStorageBlobServiceClient: sinon.stub(),
        };

        // Stub external dependencies
        sinon.stub(utils, 'getConnectionString').returns('test-connection-string');
        sinon.stub(CacheableAzureStorageBlobClientFactory, 'createConnectionStrategy').returns(mockStrategy);
        fromConnectionDetailsStub = sinon
            .stub(CacheableAzureStorageBlobClientFactory, 'fromConnectionDetailsToBlobStorageClient')
            .returns(mockStorageBlobClient);

        // Clear cache before each test to ensure isolation
        CacheableAzureStorageBlobClientFactory.clearCache();
    });

    afterEach(() => {
        // Restore all stubs and fakes
        sinon.restore();
        clock.restore();
    });

    describe('buildClientFromModelBindingData', () => {
        it('should create a new client when not in cache', () => {
            // Act
            const client = CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(testOptions);

            // Assert
            expect(fromConnectionDetailsStub.calledOnce).to.be.true;
            expect(client).to.equal(mockStorageBlobClient);
        });

        it('should return cached client when options match', () => {
            // Arrange - Create a client first
            const firstClient = CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(testOptions);
            fromConnectionDetailsStub.resetHistory(); // Reset call history

            // Act - Request client with same options
            const secondClient = CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(testOptions);

            // Assert
            expect(fromConnectionDetailsStub.called).to.be.false; // Should not create a new client
            expect(secondClient).to.equal(firstClient); // Should return same client instance
        });

        it('should update lastUsed timestamp when retrieving from cache', () => {
            // Arrange
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(testOptions);
            const initialTime = Date.now();

            // Advance clock by 1000ms
            clock.tick(1000);

            // Act
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(testOptions);

            // Get cache key and check lastUsed time
            const cacheKey = JSON.stringify({
                connection: testOptions.connection,
                containerName: testOptions.containerName,
                blobName: testOptions.blobName,
            });

            // Use reflection to access private cache
            const cache = Reflect.get(CacheableAzureStorageBlobClientFactory, 'clientCache') as Map<
                string,
                { lastUsed: number }
            >;
            const entry = cache.get(cacheKey);

            // Assert
            expect(entry).to.exist;
            expect(entry!.lastUsed).to.equal(initialTime + 1000);
        });

        it('should create different cache entries for different options', () => {
            // Arrange
            const options1 = { ...testOptions };
            const options2 = { ...testOptions, blobName: 'different-blob' };

            // Act
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(options1);
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(options2);

            // Assert
            expect(fromConnectionDetailsStub.calledTwice).to.be.true; // Should create two clients
        });
    });

    describe('evictLeastRecentlyUsedClient', () => {
        it('should evict the least recently used client when cache is full', () => {
            // Arrange - Create MAX_CACHE_SIZE clients with different options
            const maxCacheSize = Reflect.get(CacheableAzureStorageBlobClientFactory, 'MAX_CACHE_SIZE');
            const clientOptions: StorageBlobClientOptions[] = [];
            const mockClients: StorageBlobClient[] = [];

            // Create unique client options and mock clients
            for (let i = 0; i < maxCacheSize + 1; i++) {
                const options = { ...testOptions, blobName: `test-blob-${i}` };
                clientOptions.push(options);

                const mockClient = {
                    getBlobClient: sinon.stub(),
                    getContainerClient: sinon.stub(),
                    dispose: sinon.stub(),
                } as unknown as StorageBlobClient;
                mockClients.push(mockClient);

                // Setup stub to return the specific mock client for this option
                fromConnectionDetailsStub.withArgs(options).returns(mockClient);
            }

            // Create clients in sequence, updating timestamps
            for (let i = 0; i < maxCacheSize; i++) {
                const options = clientOptions[i] as StorageBlobClientOptions;
                const client = CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(options);
                expect(client).to.equal(mockClients[i]);
                clock.tick(1000); // Advance clock by 1 second between each client
            }

            let optionsFirstClient = clientOptions[0] as StorageBlobClientOptions;
            // Access the first client again to make it no longer the oldest
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(optionsFirstClient);
            clock.tick(1000);

            // Now the second client should be the oldest

            // Act - Add one more client to trigger eviction

            let optionsOfMaxCacheSize = clientOptions[0] as StorageBlobClientOptions;
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(optionsOfMaxCacheSize);

            let mockClient1 = mockClients[1] as StorageBlobClient;
            let mockClient0 = mockClients[1] as StorageBlobClient;
            // Assert
            // Client 1 should still be in cache, client 2 should have been evicted
            expect((mockClient1.dispose as sinon.SinonStub).called).to.be.false; // Client 1 (index 1) should be disposed
            expect((mockClient0.dispose as sinon.SinonStub).called).to.be.false; // Client 0 should not be disposed

            // Verify client 1 is gone by requesting it again (should create a new one)
            fromConnectionDetailsStub.resetHistory();

            let optionsSecondClient = clientOptions[0] as StorageBlobClientOptions;
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(optionsSecondClient);
            expect(fromConnectionDetailsStub.calledOnce).to.be.false; // Should create a new client
        });
    });

    describe('clearCache', () => {
        it('should dispose all clients and clear the cache', () => {
            // Arrange - Add multiple clients to cache
            const mockClient1 = { ...mockStorageBlobClient, dispose: sinon.stub() };
            const mockClient2 = { ...mockStorageBlobClient, dispose: sinon.stub() };

            fromConnectionDetailsStub.onFirstCall().returns(mockClient1);
            fromConnectionDetailsStub.onSecondCall().returns(mockClient2);

            const options1 = { ...testOptions, blobName: 'blob1' };
            const options2 = { ...testOptions, blobName: 'blob2' };

            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(options1);
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(options2);

            // Act
            CacheableAzureStorageBlobClientFactory.clearCache();

            // Assert
            expect(mockClient1.dispose.calledOnce).to.be.true;
            expect(mockClient2.dispose.calledOnce).to.be.true;

            // Verify cache is empty by adding a client again
            fromConnectionDetailsStub.resetHistory();
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(options1);
            expect(fromConnectionDetailsStub.calledOnce).to.be.true; // Should create a new client
        });
    });

    describe('error handling', () => {
        it('should throw meaningful error when client creation fails', () => {
            // Arrange
            const expectedError = new Error('Connection failed');
            fromConnectionDetailsStub.throws(expectedError);

            // Act & Assert
            expect(() => {
                CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(testOptions);
            }).to.throw(`${expectedError.message}`);
        });
    });
});
