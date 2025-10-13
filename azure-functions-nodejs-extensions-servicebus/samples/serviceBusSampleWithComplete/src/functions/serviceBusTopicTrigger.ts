// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { app, InvocationContext } from '@azure/functions';
import { ServiceBusMessageContext } from '@azure/functions-extensions-servicebus';

//This a SDKbinding = true
export async function serviceBusQueueTrigger(
    serviceBusMessageContext: ServiceBusMessageContext,
    context: InvocationContext
): Promise<void> {
    //context.log('Service bus queue function processed message:', serviceBusMessageManager);
    await serviceBusMessageContext.actions.complete(serviceBusMessageContext.messages[0]);
    context.log('triggerMetadata: ', context.triggerMetadata);
    context.log('Completing the message', serviceBusMessageContext.messages[0]);
    context.log('Completing the body', serviceBusMessageContext.messages[0].body);
}

app.serviceBusQueue('serviceBusQueueTrigger1', {
    connection: 'ServiceBusConnection',
    queueName: 'testqueue',
    sdkBinding: true,
    autoCompleteMessages: false,
    cardinality: 'many',
    handler: serviceBusQueueTrigger,
});
