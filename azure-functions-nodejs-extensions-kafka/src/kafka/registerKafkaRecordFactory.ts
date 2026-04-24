// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ModelBindingData, ResourceFactoryResolver } from '@azure/functions-extensions-base';
import { KafkaRecordFactory } from './kafkaRecordFactory';

const AZURE_KAFKA_RECORD = 'AzureKafkaRecord';

export function registerKafkaRecordFactory(): void {
    try {
        const resourceFactoryResolver = ResourceFactoryResolver.getInstance();
        if (!resourceFactoryResolver.hasResourceFactory(AZURE_KAFKA_RECORD)) {
            resourceFactoryResolver.registerResourceFactory(
                AZURE_KAFKA_RECORD,
                (modelBindingData: ModelBindingData | ModelBindingData[]) => {
                    return KafkaRecordFactory.buildFromModelBindingData(modelBindingData);
                }
            );
        }
    } catch (error) {
        throw new Error(
            `Kafka Record Factory initialization failed: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }
}
