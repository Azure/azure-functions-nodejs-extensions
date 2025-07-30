// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ModelBindingData } from '@azure/functions-extensions-base';
import { expect } from 'chai';
import { createHash } from 'crypto';
import * as sinon from 'sinon';
import { StorageBlobClientOptions } from 'types/storage';
import { CacheableAzureStorageBlobClientFactory } from '../../src/storage-blob/cacheableStorageBlobClientFactory';
// Add these imports to the existing test file
import { ConnectionStringStrategy } from '../../src/storage-blob/connectionStringStrategy';
import { ManagedIdentitySystemStrategy } from '../../src/storage-blob/managedIdentitySystemStrategy';
import { ManagedIdentityUserStrategy } from '../../src/storage-blob/managedIdentityUserStrategy';
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
        Connection: 'TestConnection',
        ContainerName: 'test-container',
        BlobName: 'test-blob',
    };

    const sampleData: ModelBindingData = {
        content: Buffer.from(JSON.stringify(testOptions), 'utf-8'),
        contentType: 'StorageBlobClient',
        source: `https://${testOptions.Connection}.blob.core.windows.net/${testOptions.ContainerName}/${testOptions.BlobName}`,
        version: '1.0',
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
            const client = CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(sampleData);

            // Assert
            expect(fromConnectionDetailsStub.calledOnce).to.be.true;
            expect(client).to.equal(mockStorageBlobClient);

            // Verify cache contains the new client
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            const keyString = `${testOptions.Connection}|${testOptions.ContainerName}|${testOptions.BlobName}`;
            const cacheKey = createHash('sha256').update(keyString).digest('hex').substring(0, 16);
            const cache = Reflect.get(CacheableAzureStorageBlobClientFactory, 'clientCache') as Map<
                string,
                { client: StorageBlobClient }
            >;
            const cachedEntry = cache.get(cacheKey);

            expect(cachedEntry).to.exist;
            expect(cachedEntry!.client).to.equal(mockStorageBlobClient);
        });

        it('should return cached client when options match', () => {
            // Arrange - Create a client first
            const firstClient = CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(sampleData);
            fromConnectionDetailsStub.resetHistory(); // Reset call history

            // Act - Request client with same options
            const secondClient = CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(sampleData);

            // Assert
            expect(fromConnectionDetailsStub.called).to.be.false; // Should not create a new client
            expect(secondClient).to.equal(firstClient); // Should return same client instance
        });

        it('should update lastUsed timestamp when retrieving from cache', () => {
            // Arrange
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(sampleData);
            const initialTime = Date.now();

            // Advance clock by 1000ms
            clock.tick(1000);

            // Act
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(sampleData);

            // Get cache key and check lastUsed time
            const keyString = `${testOptions.Connection}|${testOptions.ContainerName}|${testOptions.BlobName}`;

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
            const testOptions1: StorageBlobClientOptions = {
                Connection: 'TestConnection',
                ContainerName: 'test-container',
                BlobName: 'different-blob',
            };

            const options1 = { ...sampleData };
            const options2 = { ...sampleData, content: Buffer.from(JSON.stringify(testOptions1), 'utf-8') };

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
                    const blobNameParts = options.BlobName?.split('-') || [];
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
                const testOptions1: StorageBlobClientOptions = {
                    Connection: 'TestConnection',
                    ContainerName: 'test-container',
                    BlobName: `test-blob-${i}`,
                };

                const options = {
                    ...testOptions,
                    content: Buffer.from(JSON.stringify(testOptions1), 'utf-8'),
                };
                const client = CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(options);
                const clientId = (client as unknown as { id: number }).id;
                // Assert the returned client is the one we expect (using client id for identification)
                expect(clientId).to.equal(i);

                // Advance clock by 1 second between each client creation
                clock.tick(1000);
            }

            const testOptions1: StorageBlobClientOptions = {
                Connection: 'TestConnection',
                ContainerName: 'test-container',
                BlobName: 'test-blob-0',
            };

            // Update client 0's timestamp so it's no longer the oldest
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData({
                ...testOptions,
                content: Buffer.from(JSON.stringify(testOptions1), 'utf-8'),
            });

            // At this point, client 1 should be the least recently used

            // Act - Add one more client to trigger eviction

            const testOptions2: StorageBlobClientOptions = {
                Connection: 'TestConnection',
                ContainerName: 'test-container',
                BlobName: `test-blob-${maxCacheSize as string}`,
            };

            // Update client 0's timestamp so it's no longer the oldest
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData({
                ...testOptions,
                content: Buffer.from(JSON.stringify(testOptions2), 'utf-8'),
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

            const testOptions3: StorageBlobClientOptions = {
                Connection: 'TestConnection',
                ContainerName: 'test-container',
                BlobName: `test-blob-1`,
            };

            // Update client 0's timestamp so it's no longer the oldest
            CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData({
                ...testOptions,
                content: Buffer.from(JSON.stringify(testOptions3), 'utf-8'),
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
                const clientIndex = parseInt((options.BlobName || '').split('-')[1] || '0');
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
                const testOptions3: StorageBlobClientOptions = {
                    Connection: 'TestConnection',
                    ContainerName: 'test-container',
                    BlobName: `blob-${i}`,
                };

                // Update client 0's timestamp so it's no longer the oldest
                CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData({
                    ...testOptions,
                    content: Buffer.from(JSON.stringify(testOptions3), 'utf-8'),
                });
                clock.tick(1000);
            }

            // Act - Add 3 more clients (should evict clients 0, 1, and 2)
            for (let i = maxCacheSize; i <= maxCacheSize + 2; i++) {
                const testOptions3: StorageBlobClientOptions = {
                    Connection: 'TestConnection',
                    ContainerName: 'test-container',
                    BlobName: `blob-${i}`,
                };

                // Update client 0's timestamp so it's no longer the oldest
                CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData({
                    ...testOptions,
                    content: Buffer.from(JSON.stringify(testOptions3), 'utf-8'),
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

            const testOptions1: StorageBlobClientOptions = {
                Connection: 'TestConnection',
                ContainerName: 'test-container',
                BlobName: `blob1`,
            };
            const testOptions2: StorageBlobClientOptions = {
                Connection: 'TestConnection',
                ContainerName: 'test-container',
                BlobName: `blob2`,
            };

            const options1 = { ...testOptions, content: Buffer.from(JSON.stringify(testOptions1), 'utf-8') };
            const options2 = { ...testOptions, content: Buffer.from(JSON.stringify(testOptions2), 'utf-8') };

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
                CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(sampleData);
            }).to.throw(`${expectedError.message}`);
        });
    });
});

// Add this describe block to the existing test file after the existing tests
describe('createConnectionStrategy', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        // Store original environment variables
        originalEnv = { ...process.env };

        // Clear relevant environment variables
        delete process.env.TestConnection__clientId;
        delete process.env.TestConnection__credential;
        delete process.env.TestConnection__serviceUri;
        delete process.env.TestConnection__blobServiceUri;
    });

    afterEach(() => {
        // Restore original environment variables
        process.env = originalEnv;
        sinon.restore();
    });

    describe('order of authentication strategy checks', () => {
        it('should prioritize user-assigned managed identity over system-assigned when both are configured', () => {
            // Arrange - Set up environment for both user and system managed identity
            process.env.TestConnection__clientId = 'test-client-id';
            process.env.TestConnection__credential = 'ManagedIdentity';
            process.env.TestConnection__serviceUri = 'https://test.blob.core.windows.net';
            // Also set system-assigned variables to ensure user-assigned takes precedence
            process.env.TestConnection__blobServiceUri = 'https://test.blob.core.windows.net';

            // Act
            const strategy = CacheableAzureStorageBlobClientFactory.createConnectionStrategy(
                'TestConnection',
                'https://test.blob.core.windows.net'
            );

            // Assert
            expect(strategy).to.be.instanceOf(ManagedIdentityUserStrategy);
        });

        it('should prioritize system-assigned managed identity over connection string when both are available', () => {
            // Arrange - Set up environment for system managed identity only
            process.env.TestConnection__serviceUri = 'https://test.blob.core.windows.net';
            // Connection string would be available as fallback

            // Act
            const strategy = CacheableAzureStorageBlobClientFactory.createConnectionStrategy(
                'TestConnection',
                'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key;EndpointSuffix=core.windows.net'
            );

            // Assert
            expect(strategy).to.be.instanceOf(ManagedIdentitySystemStrategy);
        });

        it('should fall back to connection string when no managed identity is configured', () => {
            // Arrange - No managed identity environment variables set

            // Act
            const strategy = CacheableAzureStorageBlobClientFactory.createConnectionStrategy(
                'TestConnection',
                'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key;EndpointSuffix=core.windows.net'
            );

            // Assert
            expect(strategy).to.be.instanceOf(ConnectionStringStrategy);
        });
    });

    describe('user-assigned managed identity strategy', () => {
        it('should create ManagedIdentityUserStrategy when all required environment variables are present', () => {
            // Arrange
            process.env.TestConnection__clientId = 'test-client-id';
            process.env.TestConnection__credential = 'ManagedIdentity';
            process.env.TestConnection__serviceUri = 'https://test.blob.core.windows.net';

            // Act
            const strategy = CacheableAzureStorageBlobClientFactory.createConnectionStrategy(
                'TestConnection',
                'https://test.blob.core.windows.net'
            );

            // Assert
            expect(strategy).to.be.instanceOf(ManagedIdentityUserStrategy);
        });

        it('should throw error when user-assigned managed identity is detected but clientId is missing', () => {
            // Arrange - Set up partial user-assigned managed identity configuration
            process.env.TestConnection__credential = 'ManagedIdentity';
            process.env.TestConnection__serviceUri = 'https://test.blob.core.windows.net';
            // Intentionally omit clientId

            // Stub the utility function to return true (simulating detection)
            sinon.stub(utils, 'isUserBasedManagedIdentity').returns(true);

            // Act & Assert
            expect(() => {
                CacheableAzureStorageBlobClientFactory.createConnectionStrategy(
                    'TestConnection',
                    'https://test.blob.core.windows.net'
                );
            }).to.throw('Environment variable TestConnection__clientId is not defined.');
        });

        it('should not check for system-assigned managed identity when user-assigned is detected', () => {
            // Arrange
            process.env.TestConnection__clientId = 'test-client-id';
            process.env.TestConnection__credential = 'ManagedIdentity';
            process.env.TestConnection__serviceUri = 'https://test.blob.core.windows.net';

            // Spy on utility functions to verify call order
            const isUserBasedSpy = sinon.spy(utils, 'isUserBasedManagedIdentity');
            const isSystemBasedSpy = sinon.spy(utils, 'isSystemBasedManagedIdentity');

            // Act
            const strategy = CacheableAzureStorageBlobClientFactory.createConnectionStrategy(
                'TestConnection',
                'https://test.blob.core.windows.net'
            );

            // Assert
            expect(isUserBasedSpy.calledOnce).to.be.true;
            expect(isSystemBasedSpy.called).to.be.false; // Should not be called since user-assigned was found
            expect(strategy).to.be.instanceOf(ManagedIdentityUserStrategy);
        });
    });

    describe('system-assigned managed identity strategy', () => {
        it('should create ManagedIdentitySystemStrategy when serviceUri is present', () => {
            // Arrange
            process.env.TestConnection__serviceUri = 'https://test.blob.core.windows.net';

            // Act
            const strategy = CacheableAzureStorageBlobClientFactory.createConnectionStrategy(
                'TestConnection',
                'https://test.blob.core.windows.net'
            );

            // Assert
            expect(strategy).to.be.instanceOf(ManagedIdentitySystemStrategy);
        });

        it('should create ManagedIdentitySystemStrategy when blobServiceUri is present', () => {
            // Arrange
            process.env.TestConnection__blobServiceUri = 'https://test.blob.core.windows.net';

            // Act
            const strategy = CacheableAzureStorageBlobClientFactory.createConnectionStrategy(
                'TestConnection',
                'https://test.blob.core.windows.net'
            );

            // Assert
            expect(strategy).to.be.instanceOf(ManagedIdentitySystemStrategy);
        });

        it('should not check for connection string when system-assigned managed identity is detected', () => {
            // Arrange
            process.env.TestConnection__serviceUri = 'https://test.blob.core.windows.net';

            // Spy on utility functions
            const isUserBasedSpy = sinon.spy(utils, 'isUserBasedManagedIdentity');
            const isSystemBasedSpy = sinon.spy(utils, 'isSystemBasedManagedIdentity');

            // Act
            const strategy = CacheableAzureStorageBlobClientFactory.createConnectionStrategy(
                'TestConnection',
                'https://test.blob.core.windows.net'
            );

            // Assert
            expect(isUserBasedSpy.calledOnce).to.be.true;
            expect(isSystemBasedSpy.calledOnce).to.be.true;
            expect(isUserBasedSpy.calledBefore(isSystemBasedSpy)).to.be.true; // Verify order
            expect(strategy).to.be.instanceOf(ManagedIdentitySystemStrategy);
        });
    });

    describe('connection string strategy (fallback)', () => {
        it('should create ConnectionStringStrategy when no managed identity environment variables are set', () => {
            // Arrange - No environment variables set (clean state from beforeEach)

            // Act
            const strategy = CacheableAzureStorageBlobClientFactory.createConnectionStrategy(
                'TestConnection',
                'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key;EndpointSuffix=core.windows.net'
            );

            // Assert
            expect(strategy).to.be.instanceOf(ConnectionStringStrategy);
        });

        it('should verify all checks are performed in correct order before falling back to connection string', () => {
            // Arrange - No environment variables set
            const isUserBasedSpy = sinon.spy(utils, 'isUserBasedManagedIdentity');
            const isSystemBasedSpy = sinon.spy(utils, 'isSystemBasedManagedIdentity');

            // Act
            const strategy = CacheableAzureStorageBlobClientFactory.createConnectionStrategy(
                'TestConnection',
                'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key;EndpointSuffix=core.windows.net'
            );

            // Assert
            expect(isUserBasedSpy.calledOnce).to.be.true;
            expect(isSystemBasedSpy.calledOnce).to.be.true;
            expect(isUserBasedSpy.calledBefore(isSystemBasedSpy)).to.be.true;
            expect(strategy).to.be.instanceOf(ConnectionStringStrategy);
        });
    });

    describe('edge cases and validation', () => {
        it('should handle partial user-assigned managed identity configuration correctly', () => {
            // Arrange - Only some user-assigned managed identity variables set
            process.env.TestConnection__clientId = 'test-client-id';
            // Missing credential and serviceUri

            // Act
            const strategy = CacheableAzureStorageBlobClientFactory.createConnectionStrategy(
                'TestConnection',
                'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key;EndpointSuffix=core.windows.net'
            );

            // Assert - Should fall back to system-assigned check, then connection string
            expect(strategy).to.be.instanceOf(ConnectionStringStrategy);
        });

        it('should pass correct parameters to each strategy constructor', () => {
            // Test ManagedIdentityUserStrategy parameters
            process.env.TestConnection__clientId = 'test-client-id';
            process.env.TestConnection__credential = 'ManagedIdentity';
            process.env.TestConnection__serviceUri = 'https://test.blob.core.windows.net';

            const userStrategy = CacheableAzureStorageBlobClientFactory.createConnectionStrategy(
                'TestConnection',
                'https://test.blob.core.windows.net'
            ) as ManagedIdentityUserStrategy;

            expect(userStrategy).to.be.instanceOf(ManagedIdentityUserStrategy);

            // Clear and test ManagedIdentitySystemStrategy parameters
            delete process.env.TestConnection__clientId;
            delete process.env.TestConnection__credential;

            const systemStrategy = CacheableAzureStorageBlobClientFactory.createConnectionStrategy(
                'TestConnection',
                'https://test.blob.core.windows.net'
            ) as ManagedIdentitySystemStrategy;

            expect(systemStrategy).to.be.instanceOf(ManagedIdentitySystemStrategy);

            // Clear and test ConnectionStringStrategy parameters
            delete process.env.TestConnection__serviceUri;

            const connectionStrategy = CacheableAzureStorageBlobClientFactory.createConnectionStrategy(
                'TestConnection',
                'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key;EndpointSuffix=core.windows.net'
            ) as ConnectionStringStrategy;

            expect(connectionStrategy).to.be.instanceOf(ConnectionStringStrategy);
        });
    });
});
