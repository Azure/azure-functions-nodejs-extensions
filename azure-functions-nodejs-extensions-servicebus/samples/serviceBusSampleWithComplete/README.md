# Service Bus Complete Message Sample

This sample demonstrates the basic usage of Azure Service Bus triggers with manual message completion using the Service Bus Node.js extensions for Azure Functions.

## v0.4.0 Breaking Change

> **Important**: This sample uses `@azure/functions-extensions-servicebus` v0.4.0, which contains a **breaking change** ([Issue #27](https://github.com/Azure/azure-functions-nodejs-extensions/issues/27), [PR #36](https://github.com/Azure/azure-functions-nodejs-extensions/pull/36)):
>
> - **Before (v0.3.x)**: `message.body` was automatically parsed (e.g., JSON strings were parsed into JS objects)
> - **After (v0.4.0)**: `message.body` returns a raw `Buffer` — you must parse it explicitly

## Overview

This sample shows how to:
- Set up a Service Bus queue trigger with SDK binding enabled
- **Parse `message.body` as a `Buffer`** (v0.4.0 breaking change)
- Complete messages explicitly using the ServiceBusMessageContext
- Abandon messages with modified application properties for retry tracking
- Handle multiple messages with cardinality set to 'many'

## Key Features

- **SDK Binding**: Uses `sdkBinding: true` for advanced Service Bus operations
- **Manual Completion**: `autoCompleteMessages: false` allows explicit message handling  
- **Buffer Body Handling**: Explicitly parses `message.body` from `Buffer` to JSON (v0.4.0)
- **Keyless Authentication**: Uses Managed Identity / RBAC (no connection strings)
- **Retry with Abandon**: Tracks retry count via `applicationProperties`, completes after max retries

## Code Structure

### Main Function (`serviceBusTopicTrigger.ts`)

```typescript
export async function serviceBusQueueTrigger(
    serviceBusMessageContext: ServiceBusMessageContext,
    context: InvocationContext
): Promise<void> {
    const message = serviceBusMessageContext.messages[0];

    // v0.4.0: message.body is a Buffer - parse it explicitly
    const bodyBuffer = message.body as Buffer;
    const bodyText = bodyBuffer.toString('utf8');
    const bodyData = JSON.parse(bodyText);
    context.log('Parsed message body:', bodyData);

    // Retry logic using applicationProperties
    const currentRetryCount = message.applicationProperties?.retryCnt
        ? parseInt(message.applicationProperties.retryCnt as string)
        : 0;

    if (currentRetryCount >= 3) {
        await serviceBusMessageContext.actions.complete(message);
    } else {
        await serviceBusMessageContext.actions.abandon(message, {
            retryCnt: (currentRetryCount + 1).toString(),
        });
    }
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

## Prerequisites

- Node.js 20+
- [Azure Functions Core Tools](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local) v4
- Azure CLI (logged in via `az login`)
- Azure Service Bus namespace with a queue named `testqueue`
- RBAC role: **Azure Service Bus Data Owner** on the namespace

## Quick Start

### 1. Set up Azure resources

```bash
# Create resource group and Service Bus namespace
az group create --name rg-sb-test --location eastus
az servicebus namespace create --name <your-namespace> --resource-group rg-sb-test --sku Standard
az servicebus queue create --name testqueue --namespace-name <your-namespace> --resource-group rg-sb-test

# Assign RBAC role for keyless authentication
USER_ID=$(az ad signed-in-user show --query id -o tsv)
SB_ID=$(az servicebus namespace show --name <your-namespace> --resource-group rg-sb-test --query id -o tsv)
az role assignment create --assignee "$USER_ID" --role "Azure Service Bus Data Owner" --scope "$SB_ID"
```

### 2. Configure local settings

Copy the example file and update the namespace:

```bash
cp local.settings.json.example local.settings.json
```

Edit `local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "ServiceBusConnection__fullyQualifiedNamespace": "<your-namespace>.servicebus.windows.net"
  }
}
```

### 3. Install, build, and run

```bash
npm install
npm run build
func start
```

### 4. Send test messages

Send messages to your `testqueue` using Azure Portal, Service Bus Explorer, or the `sendTestMessage.js` from another sample.

## Configuration

### Function Settings

| Setting | Value | Description |
|---------|-------|-------------|
| `sdkBinding` | `true` | Enables advanced Service Bus SDK features |
| `autoCompleteMessages` | `false` | Requires manual message completion |
| `cardinality` | `'many'` | Processes multiple messages per invocation |
| `queueName` | `'testqueue'` | Target Service Bus queue name |

## Expected Behavior

When a JSON message is received:

1. **Buffer Received**: `message.body` is a raw `Buffer`
2. **Explicit Parse**: The function converts the Buffer to string and calls `JSON.parse()`
3. **Retry Check**: Reads `retryCnt` from `applicationProperties`
4. **Abandon or Complete**: Abandons with incremented retry count, or completes at max retries
5. **Logging**: Outputs parsed body and trigger metadata

## Migration from v0.3.x

```typescript
// Before (v0.3.x) — body was auto-parsed
const data = message.body; // already a JS object

// After (v0.4.0) — body is a Buffer, parse explicitly
const data = JSON.parse((message.body as Buffer).toString('utf8'));
```

## Message Actions Available

With `sdkBinding: true`, you have access to all Service Bus message actions:

- `complete()` - Mark message as successfully processed
- `abandon()` - Return message to queue for retry (with optional property modifications)
- `deadletter()` - Send message to dead letter queue
- `defer()` - Defer message processing

## Authentication

This sample uses **keyless authentication** (recommended):

- The Function trigger uses `ServiceBusConnection__fullyQualifiedNamespace` in `local.settings.json`
- No connection strings or shared access keys required
- Requires `Azure Service Bus Data Owner` RBAC role on the namespace

## Troubleshooting

### Common Issues

1. **Authentication**: Ensure you are logged in with `az login` and have the RBAC role assigned
2. **Queue Name**: Verify the queue `testqueue` exists in your Service Bus namespace
3. **RBAC Propagation**: RBAC role assignments may take up to 5 minutes to propagate
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