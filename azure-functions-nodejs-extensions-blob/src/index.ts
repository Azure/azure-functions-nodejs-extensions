// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { StorageBlobClientFactoryResolver, StorageBlobClientOptions } from '@azure/functions';
import { CacheableAzureStorageBlobClientFactory } from './storage-blob/cacheableStorageBlobClientFactory';

function registerStorageBlobClientFactory(): void {
    try {
        // Check if a factory is already registered to avoid conflicts
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (!StorageBlobClientFactoryResolver.getInstance().hasFactory()) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            StorageBlobClientFactoryResolver.getInstance().registerFactory(
                (storageBlobClientOptions: StorageBlobClientOptions) => {
                    return CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(
                        storageBlobClientOptions
                    );
                }
            );
        }
    } catch (error) {
        throw new Error(
            `Custom blob client initialization failed: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

registerStorageBlobClientFactory();
