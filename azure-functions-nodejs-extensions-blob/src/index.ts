// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { StorageBlobClientOptions, StorageBlobClientRegistry } from '@azure/functions';
import { CacheableAzureStorageBlobClientFactory } from './storage-blob/cacheableStorageBlobClientFactory';

console.log('Executing extensions-blob from Index.ts...');

function registerStorageBlobClientFactoryBase(): void {
    try {
        console.log('2 Trying Registering StorageBlobClient factory...');
        // Check if a factory is already registered to avoid conflicts
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (!StorageBlobClientRegistry.getInstance().hasFactory()) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            StorageBlobClientRegistry.getInstance().registerFactory(
                (storageBlobClientOptions: StorageBlobClientOptions) => {
                    console.log('2 Registering StorageBlobClient factory...');
                    return CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(
                        storageBlobClientOptions
                    );
                }
            );
            console.log('Custom blob client factory registered successfully');
        } else {
            console.log('A blob client factory is already registered, skipping registration');
        }
    } catch (error) {
        console.error('Failed to initialize custom blob client', error);
        throw new Error(
            `Custom blob client initialization failed: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

registerStorageBlobClientFactoryBase();
