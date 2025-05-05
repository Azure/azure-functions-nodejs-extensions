// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { BlobClient, ContainerClient } from '@azure/storage-blob';

export interface StorageBlobClient {
    blobClient: BlobClient;
    containerClient: ContainerClient;
}

