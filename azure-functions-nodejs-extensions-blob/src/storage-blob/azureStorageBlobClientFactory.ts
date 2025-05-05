// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { StorageBlobClientOptions } from '@azure/functions';
import { StorageBlobClient } from '../../types/storage';
import { AzureStorageBlobClient } from './azureStorageBlobClient';
import { ConnectionStringStrategy } from './connectionStringStrategy';
import { ManagedIdentitySystemStrategy } from './managedIdentitySystemStrategy';
import { ManagedIdentityUserStrategy } from './managedIdentityUserStartegy';
import { StorageBlobServiceClientStrategy } from './storageBlobServiceClientStrategy';
import { getConnectionString, isSystemBasedManagedIdentity, isUserBasedManagedIdentity } from './utils';

/**
 * Factory class for creating Azure Blob Storage clients
 */
export class AzureStorageBlobClientFactory {
    static buildClientFromModelBindingData(storageBlobClientOptions: StorageBlobClientOptions): StorageBlobClient {
        //TODO Add type check and parsing for other connection types
        return this.fromConnectionDetailsToBlobStorageClient(storageBlobClientOptions);
    }

    /**
     * Creates a StorageBlobClient directly from connection parameters
     *
     * @param connectionDetails - Connection details for the blob storage client
     * @returns - StorageBlobClient object containing the blob client and container client
     */
    static fromConnectionDetailsToBlobStorageClient(
        storageBlobClientOptions: StorageBlobClientOptions
    ): StorageBlobClient {
        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const connectionName: string = storageBlobClientOptions.connection;
            const connectionUrl = getConnectionString(connectionName);
            const connectionStrategy = this.createConnectionStrategy(connectionName, connectionUrl);

            const azureStorageBlobClient = new AzureStorageBlobClient(
                connectionStrategy,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                storageBlobClientOptions.containerName,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                storageBlobClientOptions.blobName
            );

            const storageBlobClient: StorageBlobClient = {
                blobClient: azureStorageBlobClient.getBlobClient(),
                containerClient: azureStorageBlobClient.getContainerClient(),
            };
            return storageBlobClient;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to create client from parameters: ${errorMessage}`);
        }
    }

    /**
     * Creates the appropriate connection strategy based on the connection name and URL
     *
     * @param connectionName - The connection name
     * @param connectionUrl - The resolved connection URL
     * @returns The appropriate StorageBlobServiceClientStrategy
     */
    static createConnectionStrategy(connectionName: string, connectionUrl: string): StorageBlobServiceClientStrategy {
        // User-assigned managed identity takes precedence
        if (isUserBasedManagedIdentity(connectionName)) {
            const clientId = process.env[`${connectionName}__clientId`];
            if (!clientId) {
                throw new Error(`Environment variable ${connectionName}__clientId is not defined.`);
            }
            return new ManagedIdentityUserStrategy(connectionUrl, clientId);
        }

        // Next, check for system-assigned managed identity
        if (isSystemBasedManagedIdentity(connectionName)) {
            return new ManagedIdentitySystemStrategy(connectionUrl);
        }

        // Default to connection string
        return new ConnectionStringStrategy(connectionUrl);
    }
}
