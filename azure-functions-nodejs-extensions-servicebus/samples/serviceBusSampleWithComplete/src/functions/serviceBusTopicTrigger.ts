// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import '@azure/functions-extensions-servicebus'; // Ensure the Service Bus extension is imported
import { app, InvocationContext } from '@azure/functions';
import { ServiceBusMessageContext } from '@azure/functions-extensions-servicebus';
import { parseBody } from '../servicebus-helpers'; // Interim helper until #50 lands

// This sample uses sdkBinding = true with manual message completion.
// With v0.4.0, message.body is returned as a raw Buffer instead of auto-parsed object.
export async function serviceBusQueueTrigger(
    serviceBusMessageContext: ServiceBusMessageContext,
    context: InvocationContext
): Promise<void> {
    const message = serviceBusMessageContext.messages[0];

    // v0.4.0: message.body is a Buffer — use parseBody<T>() helper for one-line parsing
    const bodyData = parseBody(message);
    context.log('Parsed message body:', bodyData);

    // Get current retry count from custom properties, default to 0
    const currentRetryCount = message.applicationProperties?.retryCnt
        ? parseInt(message.applicationProperties.retryCnt as string)
        : 0;
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
            errorMessage: 'Processing failed',
        };

        context.log(`Abandoning message with retry count: ${newRetryCount}`);
        await serviceBusMessageContext.actions.abandon(message, propertiesToModify);
    }

    context.log('triggerMetadata: ', context.triggerMetadata);
}

app.serviceBusQueue('serviceBusQueueTrigger1', {
    connection: 'ServiceBusConnection',
    queueName: 'testqueue',
    sdkBinding: true,
    autoCompleteMessages: false,
    cardinality: 'many',
    handler: serviceBusQueueTrigger,
});
