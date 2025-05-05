// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { BlobClient, ContainerClient, StoragePipelineOptions } from '@azure/storage-blob';
import { StorageBlobServiceClientStrategy } from './storageBlobServiceClientStrategy';

export class StorageBlobClient {
    private blobClient: BlobClient | undefined;
    private containerClient: ContainerClient | undefined;
    private disposed = false;

    /**
     * Creates a new StorageBlobClient instance
     *
     * @param strategyOrAccountUrl - The strategy to use for creating the BlobServiceClient or the account URL
     * @param credentialOrOptions - The credential to use for au  thentication or storage pipeline options
     * @param options - Storage pipeline options (optional, only used when the first parameter is an account URL)
     */
    constructor(
        strategy: StorageBlobServiceClientStrategy,
        containerName: string,
        blobName: string,
        options?: StoragePipelineOptions
    ) {
        const storageBlobServiceClient = strategy.createStorageBlobServiceClient(options);
        // Initialize container and blob clients if names are provided

        this.containerClient = storageBlobServiceClient.getContainerClient(containerName);
        this.blobClient = this.containerClient.getBlobClient(blobName);
    }

    /**
     * Gets the BlobClient instance
     * @returns The BlobClient
     */
    getBlobClient(): BlobClient {
        if (!this.blobClient) {
            throw new Error('No blob client available. A blob name must be provided in the constructor.');
        }
        return this.blobClient;
    }

    /**
     * Gets the ContainerClient instance
     * @returns The ContainerClient
     */
    getContainerClient(): ContainerClient {
        if (!this.containerClient) {
            throw new Error('No container client available. A container name must be provided in the constructor.');
        }
        return this.containerClient;
    }

    /**
     * Disposes resources held by this client
     */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        // Clear references to allow garbage collection
        this.blobClient = undefined;
        this.containerClient = undefined;
        this.disposed = true;
    }
}
