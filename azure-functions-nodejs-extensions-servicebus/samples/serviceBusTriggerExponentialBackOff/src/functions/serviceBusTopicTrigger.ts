// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { app, InvocationContext } from '@azure/functions';
import { ServiceBusMessageContext } from '@azure/functions-extensions-servicebus';

/**
 * Azure Service Bus Exponential Backoff Sample
 *
 * This sample demonstrates how Service Bus automatically handles exponential backoff
 * when messages are abandoned. The pattern simulates a failing service that eventually
 * succeeds after multiple retry attempts.
 *
 * Flow:
 * - Attempts 1-3: Simulate failure and abandon message (triggers Service Bus retry with exponential backoff)
 * - Attempt 4+: Process successfully and complete message
 * - Max retries: Send to dead letter queue
 */
export async function serviceBusExponentialBackoffTrigger(
    serviceBusMessageContext: ServiceBusMessageContext,
    context: InvocationContext
): Promise<void> {
    const message = serviceBusMessageContext.messages[0];
    if (!message) {
        context.log('No message received');
        return;
    }

    const messageId = String(message.messageId || 'unknown');
    const deliveryCount = message.deliveryCount || 0;

    context.log(`Processing message ${messageId}, delivery attempt: ${deliveryCount}`);

    try {
        // Simulate processing time that increases with each retry (2s, 4s, 8s, 16s...)
        const processingDelayMs = Math.pow(2, deliveryCount) * 1000;
        context.log(`Simulating ${processingDelayMs / 1000}s processing time...`);
        await new Promise((resolve) => setTimeout(resolve, processingDelayMs));

        // Fail first 3 attempts to demonstrate exponential backoff behavior
        if (deliveryCount <= 3) {
            context.log(`Simulated failure on attempt ${deliveryCount} - abandoning message`);
            await serviceBusMessageContext.actions.abandon(message);
            throw new Error(`Intentional failure for demo (attempt ${deliveryCount})`);
        }

        // Success after retries - complete the message
        context.log(`Success on attempt ${deliveryCount}! Completing message.`);
        await serviceBusMessageContext.actions.complete(message);
    } catch (error) {
        context.log(`Processing failed: ${String(error)}`);

        // Send to dead letter queue if max retries exceeded
        if (deliveryCount >= 5) {
            context.log('Max retries reached - sending to dead letter queue');
            await serviceBusMessageContext.actions.deadletter(
                message,
                undefined,
                'MaxRetryExceeded',
                `Failed after ${deliveryCount} attempts`
            );
        }

        throw error; // Re-throw to maintain failure semantics
    }
}

/**
 * Register Service Bus trigger for exponential backoff demonstration
 *
 * Key settings for this sample:
 * - autoCompleteMessages: false (allows manual message handling)
 * - cardinality: 'one' (processes one message at a time for clarity)
 */
app.serviceBusQueue('serviceBusExponentialBackoffTrigger', {
    connection: 'ServiceBusConnection',
    queueName: 'testqueue',
    sdkBinding: true,
    autoCompleteMessages: false,
    cardinality: 'one',
    handler: serviceBusExponentialBackoffTrigger,
});
