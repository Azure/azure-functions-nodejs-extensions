// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { StorageBlobClientOptions } from '@azure/functions-extensions-base';
import { expect } from 'chai';
import { createHash } from 'crypto';
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
            dispose: sinon.stub(),
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
            const keyString = `${testOptions.connection}|${testOptions.containerName}|${testOptions.blobName}`;

            // Generate SHA-256 hash for better distribution and fixed length
            const cacheKey = createHash('sha256').update(keyString).digest('hex').substring(0, 16);

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
    /*
    describe('evictLeastRecentlyUsedClient', () => {
        it('should evict the least recently used client when cache is full', () => {
            // Arrange - Create MAX_CACHE_SIZE clients with different options
            const maxCacheSize = Reflect.get(CacheableAzureStorageBlobClientFactory, 'MAX_CACHE_SIZE');
            const clientOptions: StorageBlobClientOptions[] = [];
            const mockClients: StorageBlobClient[] = [];

            // Create unique client options and mock clients
            for (let i = 0; i <= maxCacheSize; i++) {
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

            const optionsFirstClient = clientOptions[0] as StorageBlobClientOptions;
            // Access the first client again to make it no longer the oldest
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(optionsFirstClient);

            // Now the second client should be the oldest

            // Act - Add one more client to trigger eviction
            const optionsOfMaxCacheSize = clientOptions[maxCacheSize] as StorageBlobClientOptions;
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(optionsOfMaxCacheSize);

            const mockClient1 = mockClients[1] as StorageBlobClient;
            const mockClient0 = mockClients[0] as StorageBlobClient;
            // Assert
            // Client 1 should still be in cache, client 2 should have been evicted
            expect((mockClient1.dispose as sinon.SinonStub).called).to.be.true; // Client 1  should be disposed
            expect((mockClient0.dispose as sinon.SinonStub).called).to.be.false; // Client 0 should not be disposed

            // Verify client 1 is gone by requesting it again (should create a new one)
            fromConnectionDetailsStub.resetHistory();

            const optionsSecondClient = clientOptions[1] as StorageBlobClientOptions;
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(optionsSecondClient);
            expect(fromConnectionDetailsStub.calledOnce).to.be.true; // Should create a new client
        });
    });
    */

    describe('evictLeastRecentlyUsedClient', () => {
        it('should evict the least recently used client when cache is full', () => {
            // Arrange - Create MAX_CACHE_SIZE clients with different options
            const maxCacheSize = Reflect.get(CacheableAzureStorageBlobClientFactory, 'MAX_CACHE_SIZE');
            const mockClients: StorageBlobClient[] = [];

            // Reset the original stub to use a more controlled approach
            fromConnectionDetailsStub.restore();
            fromConnectionDetailsStub = sinon.stub(
                CacheableAzureStorageBlobClientFactory,
                'fromConnectionDetailsToBlobStorageClient'
            );

            // Set up the stub to return clients based on blobName
            fromConnectionDetailsStub.callsFake(
                (mockStrategy: StorageBlobServiceClientStrategy, options: StorageBlobClientOptions) => {
                    const blobNameParts = options.blobName?.split('-') || [];
                    const clientIndex = blobNameParts.length > 2 ? parseInt(blobNameParts[2] as string, 10) : 0;
                    return mockClients[clientIndex];
                }
            );

            // Create the mock clients
            for (let i = 0; i <= maxCacheSize; i++) {
                mockClients.push({
                    getBlobClient: sinon.stub().returns(`blobClient-${i}`),
                    getContainerClient: sinon.stub().returns(`containerClient-${i}`),
                    dispose: sinon.stub().named(`dispose-${i}`),
                    id: i, // Add an identifier to help with debugging
                } as unknown as StorageBlobClient);
            }

            // Add clients to the cache in order, advancing time between each
            for (let i = 0; i < maxCacheSize; i++) {
                const options = {
                    ...testOptions,
                    blobName: `test-blob-${i}`,
                };
                const client = CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(options);
                const clientId = (client as unknown as { id: number }).id;
                // Assert the returned client is the one we expect (using client id for identification)
                expect(clientId).to.equal(i);

                // Advance clock by 1 second between each client creation
                clock.tick(1000);
            }

            // Update client 0's timestamp so it's no longer the oldest
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData({
                ...testOptions,
                blobName: `test-blob-0`,
            });

            // At this point, client 1 should be the least recently used

            // Act - Add one more client to trigger eviction
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData({
                ...testOptions,
                blobName: `test-blob-${maxCacheSize as string}`,
            });

            const client1 = mockClients[1] as StorageBlobClient;
            const client0 = mockClients[0] as StorageBlobClient;
            // Assert
            // Client 1 (the least recently used) should have been disposed
            expect((client1.dispose as sinon.SinonStub).called).to.be.true,
                'The least recently used client (client 1) should be disposed';

            // Client 0 (recently accessed) should not be disposed
            expect((client0.dispose as sinon.SinonStub).called).to.be.false,
                'The recently accessed client (client 0) should not be disposed';

            // Verify client 1 is gone by requesting it again
            fromConnectionDetailsStub.resetHistory();
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData({
                ...testOptions,
                blobName: `test-blob-1`,
            });

            expect(fromConnectionDetailsStub.calledOnce).to.be.true,
                'A new client should be created when requesting previously evicted client';
        });

        it('should correctly handle consecutive evictions when adding multiple clients', () => {
            // Arrange
            const maxCacheSize = Reflect.get(CacheableAzureStorageBlobClientFactory, 'MAX_CACHE_SIZE') as number;
            const mockClients: StorageBlobClient[] = [];

            // Set up the stub to return clients based on index
            fromConnectionDetailsStub.restore();
            fromConnectionDetailsStub = sinon.stub(
                CacheableAzureStorageBlobClientFactory,
                'fromConnectionDetailsToBlobStorageClient'
            );
            fromConnectionDetailsStub.callsFake((options: StorageBlobClientOptions) => {
                const clientIndex = parseInt((options.blobName || '').split('-')[1] || '0');
                return mockClients[clientIndex];
            });

            // Create the mock clients (maxCacheSize + 3 to test multiple evictions)
            for (let i = 0; i <= maxCacheSize + 2; i++) {
                mockClients.push({
                    getBlobClient: sinon.stub(),
                    getContainerClient: sinon.stub(),
                    dispose: sinon.stub(),
                    id: i,
                } as unknown as StorageBlobClient);
            }

            // Add maxCacheSize clients to fill the cache
            for (let i = 0; i < maxCacheSize; i++) {
                CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData({
                    ...testOptions,
                    blobName: `blob-${i}`,
                });
                clock.tick(1000);
            }

            // Act - Add 3 more clients (should evict clients 0, 1, and 2)
            for (let i = maxCacheSize; i <= maxCacheSize + 2; i++) {
                CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData({
                    ...testOptions,
                    blobName: `blob-${i}`,
                });
            }

            // Later clients should still be in cache
            for (let i = 3; i <= maxCacheSize + 2; i++) {
                const client = mockClients[i] as StorageBlobClient;
                expect((client.dispose as sinon.SinonStub).called).to.be.false,
                    `Client ${i} should not be disposed as it is still in cache`;
            }
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
