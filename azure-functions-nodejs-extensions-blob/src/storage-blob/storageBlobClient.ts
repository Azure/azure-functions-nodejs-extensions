// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { BlobClient, ContainerClient, StoragePipelineOptions } from '@azure/storage-blob';
import { StorageBlobServiceClientStrategy } from './storageBlobServiceClientStrategy';

/**
 * The `StorageBlobClient` class provides a client for interacting with Azure Blob Storage.
 * It allows you to perform operations on blobs and containers within a specified storage account.
 *
 * @remarks
 * This class is designed to be used in conjunction with the Azure Functions Extensions framework.
 * It provides a simplified interface for working with Azure Blob Storage, allowing you to easily
 * create, read, update, and delete blobs and containers.
 */
export class StorageBlobClient {
    private blobClient: BlobClient | undefined;
    private containerClient: ContainerClient | undefined;
    private disposed = false;

    /**
     * Initializes a new instance of the `StorageBlobClient` class.
     *
     * @param strategy - An implementation of the `StorageBlobServiceClientStrategy` interface,
     *                   used to create the `BlobServiceClient`.
     * @param containerName - The name of the container in the storage account.
     * @param blobName - The name of the blob within the container.
     * @param options - Optional storage pipeline options for configuring the client.
     *
     * @throws {Error} If the `containerName` or `blobName` is not provided, the respective client cannot be initialized.
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
