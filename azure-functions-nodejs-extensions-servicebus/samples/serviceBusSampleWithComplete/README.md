# Service Bus Complete Message Sample

This sample demonstrates the basic usage of Azure Service Bus triggers with manual message completion using the Service Bus Node.js extensions for Azure Functions.

## Overview

This sample shows how to:
- Set up a Service Bus queue trigger with SDK binding enabled
- Process Service Bus messages manually
- Complete messages explicitly using the ServiceBusMessageContext
- Access message properties and metadata
- Handle multiple messages with cardinality set to 'many'

## Key Features

- **SDK Binding**: Uses `sdkBinding: true` for advanced Service Bus operations
- **Manual Completion**: `autoCompleteMessages: false` allows explicit message handling  
- **Multiple Messages**: `cardinality: 'many'` processes multiple messages per invocation
- **Message Access**: Full access to message properties, body, and trigger metadata

## Code Structure

### Main Function (`serviceBusTopicTrigger.ts`)

```typescript
export async function serviceBusQueueTrigger(
    serviceBusMessageContext: ServiceBusMessageContext,
    context: InvocationContext
): Promise<void> {
    // Complete the first message
    await serviceBusMessageContext.actions.complete(serviceBusMessageContext.messages[0]);
    
    // Log trigger metadata and message details
    context.log('triggerMetadata: ', context.triggerMetadata);
    context.log('Completing the message', serviceBusMessageContext.messages[0]);
    context.log('Completing the body', serviceBusMessageContext.messages[0].body);
}
```

### Function Registration

```typescript
app.serviceBusQueue('serviceBusQueueTrigger1', {
    connection: 'ServiceBusConnection',
    queueName: 'testqueue',
    sdkBinding: true,
    autoCompleteMessages: false,
    cardinality: 'many',
    handler: serviceBusQueueTrigger,
});
```

## Configuration

### Connection Settings (`local.settings.json`)

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "ServiceBusConnection": "Endpoint=sb://your-namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=your-key"
  }
}
```

### Function Settings

| Setting | Value | Description |
|---------|-------|-------------|
| `sdkBinding` | `true` | Enables advanced Service Bus SDK features |
| `autoCompleteMessages` | `false` | Requires manual message completion |
| `cardinality` | `'many'` | Processes multiple messages per invocation |
| `queueName` | `'testqueue'` | Target Service Bus queue name |

## Quick Start

1. **Prerequisites**:
   - Azure Service Bus namespace
   - Queue named `testqueue` in your namespace
   - Node.js 20+ installed
   - Azure Functions Core Tools

2. **Setup**:
   ```bash
   # Install dependencies
   npm install
   
   # Build the project
   npm run build
   ```

3. **Configure Connection**:
   Update `local.settings.json` with your Service Bus connection string

4. **Run the Function**:
   ```bash
   # Start the function app
   npm start
   # or
   func start
   ```

5. **Send Test Messages**:
   Send messages to your `testqueue` using Azure Portal, Service Bus Explorer, or Azure CLI

## Expected Behavior

When a message is received:

1. **Function Triggers**: The function is invoked with the Service Bus message(s)
2. **Message Processing**: The function accesses the first message from the batch
3. **Manual Completion**: Calls `complete()` to remove the message from the queue
4. **Logging**: Outputs trigger metadata, message details, and message body
5. **Success**: Message is successfully processed and removed from queue

## Sample Log Output

```
[2025-10-13T10:30:45.123Z] Executing 'serviceBusQueueTrigger1' (Reason='New ServiceBus message detected on 'testqueue'.', Id=abc123-def456)
[2025-10-13T10:30:45.124Z] triggerMetadata: { DeliveryCount: 1, EnqueuedTimeUtc: '2025-10-13T10:30:44.000Z', ... }
[2025-10-13T10:30:45.125Z] Completing the message ServiceBusReceivedMessage { messageId: '12345', body: 'Hello World' }
[2025-10-13T10:30:45.126Z] Completing the body Hello World
[2025-10-13T10:30:45.127Z] Executed 'serviceBusQueueTrigger1' (Succeeded, Id=abc123-def456, Duration=4ms)
```

## Message Actions Available

With `sdkBinding: true`, you have access to all Service Bus message actions:

- `complete()` - Mark message as successfully processed
- `abandon()` - Return message to queue for retry
- `deadletter()` - Send message to dead letter queue
- `defer()` - Defer message processing

## Important Notes

- **Manual Completion Required**: With `autoCompleteMessages: false`, you must explicitly complete messages
- **Error Handling**: Unhandled exceptions will cause messages to be abandoned automatically
- **Multiple Messages**: The sample processes only the first message but receives multiple with `cardinality: 'many'`
- **Production Considerations**: Add proper error handling and logging for production use

## Troubleshooting

### Common Issues

1. **Connection String**: Ensure your Service Bus connection string is correct in `local.settings.json`
2. **Queue Name**: Verify the queue `testqueue` exists in your Service Bus namespace
3. **Permissions**: Check that your connection string has appropriate permissions (Listen, Send)
4. **Build Errors**: Run `npm run build` to compile TypeScript before starting

### Useful Commands

```bash
# Clean and rebuild
npm run clean && npm run build

# Watch for changes during development
npm run watch

# Start with verbose logging
func start --verbose
```

This sample provides a foundation for building more complex Service Bus message processing scenarios with full control over message lifecycle management.