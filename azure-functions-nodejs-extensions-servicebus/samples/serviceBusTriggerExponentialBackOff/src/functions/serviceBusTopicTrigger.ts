// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ServiceBusMessageContext, ServiceBusMessageActions } from '@azure/functions-extensions-servicebus';
import { app, InvocationContext } from '@azure/functions';
import { ServiceBusClient } from '@azure/service-bus';
import { DefaultAzureCredential } from '@azure/identity';
import { bodyAsText } from '../servicebus-helpers'; // Interim helper until #50 lands

// This sample demonstrates exponential backoff with SDK binding.
// With v0.4.0, message.body is returned as a raw Buffer instead of auto-parsed object.
export async function serviceBusQueueTrigger(
    serviceBusMessageContext: ServiceBusMessageContext,
    context: InvocationContext
): Promise<void> {
    const serviceBusMessageActions = serviceBusMessageContext.actions as ServiceBusMessageActions;
    const receivedMessage = serviceBusMessageContext.messages[0];

    // v0.4.0: message.body is a Buffer — use bodyAsText() helper
    const bodyText = bodyAsText(receivedMessage);
    context.log('Processing message:', receivedMessage.messageId);
    context.log('Message body (raw text):', bodyText);

    // Check current retry count
    const currentRetryCount = Number(receivedMessage.applicationProperties?.retryCount) || 0;
    const maxRetries = 3; // Maximum number of retries allowed

    context.log(`Current retry count: ${currentRetryCount}, Max retries: ${maxRetries}`);

    // If max retries exceeded, dead-letter the message
    if (currentRetryCount >= maxRetries) {
        context.log(`Message has exceeded maximum retry count (${maxRetries}). Dead-lettering message.`);
        await serviceBusMessageActions.deadletter(receivedMessage);
        return;
    }

    try {
        // Use managed identity with fully qualified namespace (keyless authentication)
        const fullyQualifiedNamespace = process.env.ServiceBusConnection__fullyQualifiedNamespace;
        if (!fullyQualifiedNamespace) {
            throw new Error('ServiceBusConnection__fullyQualifiedNamespace is not set in environment variables');
        }

        const credential = new DefaultAzureCredential();
        const serviceBusClient = new ServiceBusClient(fullyQualifiedNamespace, credential);
        context.log(`Using managed identity with namespace: ${fullyQualifiedNamespace}`);

        // Create sender for the same queue
        const sender = serviceBusClient.createSender('testqueue');

        // Schedule the message for 10 seconds later
        const scheduledEnqueueTime = new Date(Date.now() + 10 * 1000);

        const retryCnt = currentRetryCount + 1;
        if (retryCnt <= 3) {
            // Create a new message with the same body text and properties
            const messageToSchedule = {
                body: bodyText,
                messageId: `scheduled-${receivedMessage.messageId}`,
                contentType: receivedMessage.contentType,
                correlationId: receivedMessage.correlationId,
                subject: receivedMessage.subject,
                applicationProperties: {
                    ...receivedMessage.applicationProperties,
                    retryCount: retryCnt,
                    originalMessageId: receivedMessage.messageId,
                    scheduledAt: new Date().toISOString(),
                    originalEnqueueTime: receivedMessage.enqueuedTimeUtc?.toISOString(),
                },
                scheduledEnqueueTime: scheduledEnqueueTime,
            };

            // Schedule the message
            const sequenceNumbers = await sender.scheduleMessages([messageToSchedule], scheduledEnqueueTime);

            context.log(`Message scheduled successfully with sequence number: ${sequenceNumbers[0]}`);
            context.log(`Message will be delivered at: ${scheduledEnqueueTime.toISOString()}`);
            context.log(`Retry count incremented to: ${retryCnt}`);
        }

        // Close the sender and client
        await sender.close();
        await serviceBusClient.close();

        // Complete the original message after successful scheduling
        await serviceBusMessageActions.complete(receivedMessage);
        context.log('Original message completed successfully');
    } catch (error) {
        context.error('Error processing message:', error);
        // In case of error, abandon the message for retry
        await serviceBusMessageActions.abandon(receivedMessage);
        throw error;
    }
}

app.serviceBusQueue('serviceBusQueueTrigger1', {
    connection: 'ServiceBusConnection',
    queueName: 'testqueue',
    sdkBinding: true,
    autoCompleteMessages: false,
    cardinality: 'many',
    handler: serviceBusQueueTrigger,
});
