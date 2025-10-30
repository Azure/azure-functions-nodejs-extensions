
import {ServiceBusMessageContext} from "@azure/functions-extensions-servicebus"
import { app, InvocationContext } from "@azure/functions";
import {ServiceBusMessageActions} from "@azure/functions-extensions-servicebus"
import { ServiceBusClient } from "@azure/service-bus";
import { DefaultAzureCredential } from "@azure/identity";

//This a SDKbinding = true
export async function serviceBusQueueTrigger(serviceBusMessageContext: ServiceBusMessageContext, context: InvocationContext, ): Promise<void> {
    //context.log('Service bus queue function processed message:', serviceBusMessageManager);
    const serviceBusMessageActions = serviceBusMessageContext.actions as ServiceBusMessageActions;
    const receivedMessage = serviceBusMessageContext.messages[0];
    
    context.log('Processing message', receivedMessage);
    context.log('Message body', receivedMessage.body);
    
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
        // Get the Service Bus connection string from environment variables
        let connectionString = process.env.ServiceBusConnection;
        let serviceBusClient: ServiceBusClient;
        
        // Check if we have a full connection string with shared access key
        if (connectionString && connectionString.includes('SharedAccessKey')) {
            // Use connection string with shared access key
            serviceBusClient = new ServiceBusClient(connectionString);
            context.log('Using connection string with shared access key');
        } else {
            // Use managed identity with fully qualified namespace
            const fullyQualifiedNamespace = process.env.ServiceBusConnection__fullyQualifiedNamespace;
            if (fullyQualifiedNamespace) {
                // Create credential for managed identity
                const credential = new DefaultAzureCredential();
                serviceBusClient = new ServiceBusClient(fullyQualifiedNamespace, credential);
                context.log(`Using managed identity with namespace: ${fullyQualifiedNamespace}`);
            } else {
                throw new Error("Neither valid ServiceBusConnection nor ServiceBusConnection__fullyQualifiedNamespace found in environment variables");
            }
        }
        
        // Create sender for the same queue (or you can specify a different queue/topic)
        const sender = serviceBusClient.createSender("testqueue");
        
        // Schedule the message for 10 seconds later (you can adjust this as needed)
        const scheduledEnqueueTime = new Date(Date.now() + 10 * 1000); // 10 seconds from now

        const retryCnt = (Number(receivedMessage.applicationProperties?.retryCount) || 0) + 1;
        if(retryCnt <= 3) {
            // Create a new message with the same body and properties
            const messageToSchedule = {
                body: receivedMessage.body,
                messageId: `scheduled-${receivedMessage.messageId}`,
                contentType: receivedMessage.contentType,
                correlationId: receivedMessage.correlationId,
                subject: receivedMessage.subject,
                applicationProperties: {
                    ...receivedMessage.applicationProperties,
                    retryCount: retryCnt,
                    originalMessageId: receivedMessage.messageId,
                    scheduledAt: new Date().toISOString(),
                    originalEnqueueTime: receivedMessage.enqueuedTimeUtc?.toISOString()
                },
                scheduledEnqueueTime: scheduledEnqueueTime
            };
        
            // Schedule the message
            const sequenceNumbers = await sender.scheduleMessages([messageToSchedule], scheduledEnqueueTime);
            
            const newRetryCount = (Number(receivedMessage.applicationProperties?.retryCount) || 0) + 1;
            context.log(`Message scheduled successfully with sequence number: ${sequenceNumbers[0]}`);
            context.log(`Message will be delivered at: ${scheduledEnqueueTime.toISOString()}`);
            context.log(`Retry count incremented to: ${newRetryCount}`);
        }
        
        // Close the sender and client
        await sender.close();
        await serviceBusClient.close();
        
        // Complete the original message after successful scheduling
        await serviceBusMessageActions.complete(receivedMessage);
        context.log('Original message completed successfully');
        
    } catch (error) {
        context.error('Error processing message:', error);
        // In case of error, you might want to abandon or dead-letter the message
        await serviceBusMessageActions.abandon(receivedMessage);
        throw error;
    }
}

app.serviceBusQueue('serviceBusQueueTrigger1', {
    connection: 'ServiceBusConnection',
    queueName: 'testqueue',
    sdkBinding: true,
    autoCompleteMessages: false,
    cardinality: "many",
    handler: serviceBusQueueTrigger
});
