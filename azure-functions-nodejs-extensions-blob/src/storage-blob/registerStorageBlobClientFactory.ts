// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ModelBindingData, ResourceFactoryResolver } from '@azure/functions-extensions-base';
import { CacheableAzureStorageBlobClientFactory } from './cacheableStorageBlobClientFactory';

const AZURE_STORAGE_BLOBS = 'AzureStorageBlobs';
export function registerStorageBlobClientFactory(): void {
    try {
        // Check if a factory is already registered to avoid conflicts
        if (!ResourceFactoryResolver.getInstance().hasResourceFactory(AZURE_STORAGE_BLOBS)) {
            ResourceFactoryResolver.getInstance().registerResourceFactory(
                AZURE_STORAGE_BLOBS,
                (modelBindingData: ModelBindingData) => {
                    return CacheableAzureStorageBlobClientFactory.buildClientFromModelBindingData(modelBindingData);
                }
            );
        }
    } catch (error) {
        throw new Error(`Blob client initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
