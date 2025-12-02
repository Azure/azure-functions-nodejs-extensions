// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { BlobServiceClient } from '@azure/storage-blob';
import { expect } from 'chai';
import { ManagedIdentitySystemStrategy } from '../../src/storage-blob/managedIdentitySystemStrategy';

describe('ManagedIdentitySystemStrategy', () => {
    beforeEach(() => {
        // Configure environment variables for managed identity testing
        process.env.IDENTITY_ENDPOINT = 'https://identity.azure.net/managed-identity';
        process.env.IDENTITY_HEADER = 'test-identity-header';
        process.env.AZURE_CLIENT_ID = ''; // Empty for system-assigned identity
    });

    it('should create BlobServiceClient with DefaultAzureCredential', () => {
        // Arrange
        const url = 'https://teststorage.blob.core.windows.net';

        // Act
        const strategy = new ManagedIdentitySystemStrategy(url);
        const result = strategy.createStorageBlobServiceClient();

        // Assert
        expect(result).to.be.instanceOf(BlobServiceClient);
        // BlobServiceClient normalizes URL by adding trailing slash
        expect(result.url).to.equal(url + '/');
    });

    it('should pass options when creating BlobServiceClient', () => {
        // Arrange
        const url = 'https://teststorage.blob.core.windows.net';
        const options = { retryOptions: { maxTries: 5 } };

        // Act
        const strategy = new ManagedIdentitySystemStrategy(url);
        const result = strategy.createStorageBlobServiceClient(options);

        // Assert
        expect(result).to.be.instanceOf(BlobServiceClient);
        // BlobServiceClient normalizes URL by adding trailing slash
        expect(result.url).to.equal(url + '/');
    });
});
