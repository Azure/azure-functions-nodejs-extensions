// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import '@azure/functions-extensions-servicebus'; // Ensure the Service Bus extension is imported
import { app, InvocationContext } from '@azure/functions';
import { ServiceBusMessageContext } from '@azure/functions-extensions-servicebus';

//This a SDKbinding = true
export async function serviceBusQueueTrigger(
    serviceBusMessageContext: ServiceBusMessageContext,
    context: InvocationContext
): Promise<void> {
    const message = serviceBusMessageContext.messages[0];
    context.log(message);
    
    // Get current retry count from custom properties, default to 0
    const currentRetryCount = message.applicationProperties?.retryCnt ? parseInt(message.applicationProperties.retryCnt as string) : 0;
    context.log(`Current retry count: ${currentRetryCount}`);
        
        if (currentRetryCount >= 3) {
            // After 3 retries, complete the message to remove it from the queue
            context.log(`Maximum retry count (3) reached. Completing message to prevent infinite loop.`);
            await serviceBusMessageContext.actions.complete(message);
            context.log('Message completed after maximum retries');
        } else {
            // Abandon with updated retry count
            const newRetryCount = currentRetryCount + 1;
            const propertiesToModify = {
                retryCnt: newRetryCount.toString(),
                lastRetryTime: new Date().toISOString(),
                errorMessage: "Processing failed"
            };
            
            context.log(`Abandoning message with retry count: ${newRetryCount}`);
            await serviceBusMessageContext.actions.abandon(message, propertiesToModify);
        }
    
    
    context.log('triggerMetadata: ', context.triggerMetadata);
    context.log('Message body:', message.body);
}

app.serviceBusQueue('serviceBusQueueTrigger1', {
    connection: 'ServiceBusConnection',
    queueName: 'testqueue',
    sdkBinding: true,
    autoCompleteMessages: false,
    cardinality: 'many',
    handler: serviceBusQueueTrigger,
});
