// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { BlobServiceClient } from '@azure/storage-blob';
import { expect } from 'chai';
import { ManagedIdentityUserStrategy } from '../../src/storage-blob/managedIdentityUserStrategy';

describe('ManagedIdentityUserStrategy', () => {
    it('should create BlobServiceClient with ManagedIdentityCredential and clientId', () => {
        // Arrange
        const url = 'https://teststorage.blob.core.windows.net';
        const clientId = '12345678-1234-1234-1234-123456789012';

        // Act
        const strategy = new ManagedIdentityUserStrategy(url, clientId);
        const result = strategy.createStorageBlobServiceClient();

        // Assert
        expect(result).to.be.instanceOf(BlobServiceClient);
        // BlobServiceClient normalizes URL by adding trailing slash
        expect(result.url).to.equal(url + '/');
    });

    it('should pass options when creating BlobServiceClient', () => {
        // Arrange
        const url = 'https://teststorage.blob.core.windows.net';
        const clientId = '12345678-1234-1234-1234-123456789012';
        const options = { retryOptions: { maxTries: 5 } };

        // Act
        const strategy = new ManagedIdentityUserStrategy(url, clientId);
        const result = strategy.createStorageBlobServiceClient(options);

        // Assert
        expect(result).to.be.instanceOf(BlobServiceClient);
        // BlobServiceClient normalizes URL by adding trailing slash
        expect(result.url).to.equal(url + '/');
    });
});
