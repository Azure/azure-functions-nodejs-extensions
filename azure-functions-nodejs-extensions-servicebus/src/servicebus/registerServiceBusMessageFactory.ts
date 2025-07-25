// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ModelBindingData, ResourceFactoryResolver } from '@azure/functions-extensions-base';
import { AzureServiceBusMessageFactory } from './azureServiceBusMessageFactory';

const AZURE_SERVICE_BUS = 'AzureServiceBusReceivedMessage';
export function registerServiceBusMessageFactory(): void {
    try {
        const resourceFactoryResolver = ResourceFactoryResolver.getInstance();
        // Check if a factory is already registered to avoid conflicts
        if (!resourceFactoryResolver.hasResourceFactory(AZURE_SERVICE_BUS)) {
            resourceFactoryResolver.registerResourceFactory(
                AZURE_SERVICE_BUS,
                (modelBindingData: ModelBindingData | ModelBindingData[]) => {
                    return AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(modelBindingData);
                }
            );
        }
    } catch (error) {
        throw new Error(
            `Service Bus Message Factory initialization failed: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }
}
