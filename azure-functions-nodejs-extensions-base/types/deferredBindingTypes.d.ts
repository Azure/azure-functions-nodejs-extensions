// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

/**
 * Enum for supported binding types in Azure Functions
 */
export namespace DeferredBindingTypes {
    /**
     * Azure Storage Blobs binding type identifier
     * Used for blob storage client factory registration
     */
    export const AZURE_STORAGE_BLOBS = 'AzureStorageBlobs';
    /**
     * Azure Service Bus received message binding type identifier
     */
    export const AZURE_SERVICEBUS_RECEIVED_MESSAGE = 'AzureServiceBusReceivedMessage';
    /**
     * Azure Event Hubs event data binding type identifier
     */
    export const AZURE_EVENTHUBS_EVENT_DATA = 'AzureEventHubsEventData';
    /**
     * Azure Cosmos DB binding type identifier
     */
    export const AZURE_COSMOS_DB = 'CosmosDB';
}
