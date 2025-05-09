export interface StorageBlobClientOptions {
    connection: string;
    containerName: string;
    blobName: string;
}
type StorageBlobClientFactory = (storageBlobClientOptions: StorageBlobClientOptions) => unknown;

// Class to manage the registration and creation of Storage Blob Clients Factory
export class StorageBlobClientFactoryResolver {
    private constructor();
    static getInstance(): StorageBlobClientFactoryResolver;
    registerFactory(factory: StorageBlobClientFactory): void;
    unregisterFactory(): void;
    createClient(options: StorageBlobClientOptions): unknown;
    hasFactory(): boolean;
}
