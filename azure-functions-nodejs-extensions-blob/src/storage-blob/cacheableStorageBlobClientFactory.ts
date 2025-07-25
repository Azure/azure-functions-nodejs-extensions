// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ModelBindingData } from '@azure/functions-extensions-base';
import { createHash } from 'crypto';
import { StorageBlobClientOptions } from 'types/storage';
import { ConnectionStringStrategy } from './connectionStringStrategy';
import { ManagedIdentitySystemStrategy } from './managedIdentitySystemStrategy';
import { ManagedIdentityUserStrategy } from './managedIdentityUserStrategy';
import { StorageBlobClient } from './storageBlobClient';
import { StorageBlobServiceClientStrategy } from './storageBlobServiceClientStrategy';
import {
    getConnectionString,
    isSystemBasedManagedIdentity,
    isUserBasedManagedIdentity,
    parseConnectionDetails,
} from './utils';

/**
 * Cache entry containing client and metadata
 */
interface CacheEntry {
    client: StorageBlobClient;
    lastUsed: number;
}

/**
 * Factory class for creating and caching Azure Blob Storage clients
 * following Azure best practices for client reuse and lifecycle management
 */
export class CacheableAzureStorageBlobClientFactory {
    private static readonly clientCache = new Map<string, CacheEntry>();
    private static readonly MAX_CACHE_SIZE = 5;

    /**
     * Generates a cache key from client options using a cryptographic hash
     * for improved performance and consistency
     */
    private static generateCacheKey(storageBlobClientOptions: StorageBlobClientOptions): string {
        // There wont be undefined values as we have a check already in '@azure/functions library
        // Create a deterministic string representation
        const keyString = `${storageBlobClientOptions.Connection}|${storageBlobClientOptions.ContainerName}|${storageBlobClientOptions.BlobName}`;

        // Generate SHA-256 hash for better distribution and fixed length
        return createHash('sha256').update(keyString).digest('hex').substring(0, 16); // Use first 16 chars (64 bits) for reasonable uniqueness
    }

    /**
     * Gets or creates an Azure Storage Blob client from model binding data
     * with caching based on the provided options
     */
    static buildClientFromModelBindingData(modelBindingData: ModelBindingData): StorageBlobClient {
        const blobConnectionDetails = parseConnectionDetails(modelBindingData.content);

        const cacheKey = this.generateCacheKey(blobConnectionDetails);
        const cachedEntry = this.clientCache.get(cacheKey);

        // Return cached client if available
        if (cachedEntry) {
            cachedEntry.lastUsed = Date.now();
            return cachedEntry.client;
        }

        // Create new client if not cached

        const connectionName: string = blobConnectionDetails.Connection;
        const connectionUrl = getConnectionString(connectionName);
        const strategy = this.createConnectionStrategy(connectionName, connectionUrl);
        const client = this.fromConnectionDetailsToBlobStorageClient(strategy, blobConnectionDetails);

        // Manage cache size if needed
        if (this.clientCache.size >= this.MAX_CACHE_SIZE) {
            this.evictLeastRecentlyUsedClient();
        }

        // Add to cache
        this.clientCache.set(cacheKey, {
            client,
            lastUsed: Date.now(),
        });

        return client;
    }

    /**
     * Creates a StorageBlobClient directly from connection parameters
     */
    static fromConnectionDetailsToBlobStorageClient(
        strategy: StorageBlobServiceClientStrategy,
        storageBlobClientOptions: StorageBlobClientOptions
    ): StorageBlobClient {
        try {
            const storageBlobClient = new StorageBlobClient(
                strategy,
                storageBlobClientOptions.ContainerName,
                storageBlobClientOptions.BlobName
            );

            return storageBlobClient;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to create client from parameters: ${errorMessage}`);
        }
    }

    /**
     * Creates the appropriate connection strategy based on the connection name and URL
     */
    static createConnectionStrategy(connectionName: string, connectionUrl: string): StorageBlobServiceClientStrategy {
        // Check for system-assigned managed identity
        if (isSystemBasedManagedIdentity(connectionName)) {
            return new ManagedIdentitySystemStrategy(connectionUrl);
        }
        // Check User-assigned managed identity
        if (isUserBasedManagedIdentity(connectionName)) {
            const clientId = process.env[`${connectionName}__clientId`];
            if (!clientId) {
                throw new Error(`Environment variable ${connectionName}__clientId is not defined.`);
            }
            return new ManagedIdentityUserStrategy(connectionUrl, clientId);
        }

        // Default to connection string
        return new ConnectionStringStrategy(connectionUrl);
    }

    /**
     * Removes the least recently used client from the cache
     */
    private static evictLeastRecentlyUsedClient(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        // Find the least recently used client
        for (const [key, entry] of this.clientCache.entries()) {
            if (entry.lastUsed < oldestTime) {
                oldestTime = entry.lastUsed;
                oldestKey = key;
            }
        }

        // Remove it if found
        if (oldestKey) {
            const entry = this.clientCache.get(oldestKey);
            if (entry) {
                entry.client.dispose();
            }
            this.clientCache.delete(oldestKey);
        }
    }

    //TODO see if we need to clear cache at the event appTerminate.

    /**
     * Clears the entire cache and disposes all clients
     */
    static clearCache(): void {
        for (const entry of this.clientCache.values()) {
            entry.client.dispose();
        }
        this.clientCache.clear();
    }
}
