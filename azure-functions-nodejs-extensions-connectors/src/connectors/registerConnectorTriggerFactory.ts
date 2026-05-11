// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ModelBindingData, ResourceFactoryResolver } from '@azure/functions-extensions-base';
import { ConnectorTriggerContextFactory } from './connectorTriggerContextFactory';

const CONNECTOR_TRIGGER = 'ConnectorTrigger';

export function registerConnectorTriggerFactory(): void {
    try {
        const resourceFactoryResolver = ResourceFactoryResolver.getInstance();

        if (!resourceFactoryResolver.hasResourceFactory(CONNECTOR_TRIGGER)) {
            resourceFactoryResolver.registerResourceFactory(
                CONNECTOR_TRIGGER,
                (modelBindingData: ModelBindingData | ModelBindingData[]) => {
                    return ConnectorTriggerContextFactory.buildFromModelBindingData(modelBindingData);
                }
            );
        }
    } catch (error) {
        throw new Error(
            `Connector Trigger Factory initialization failed: ${
                error instanceof Error ? error.message : 'Unknown error.'
            }`
        );
    }
}
