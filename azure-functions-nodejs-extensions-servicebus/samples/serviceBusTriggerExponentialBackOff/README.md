# Service Bus Exponential Backoff Demo

This sample demonstrates exponential backoff retry with scheduled message re-delivery using Azure Service Bus and `@azure/functions-extensions-servicebus` v0.4.0.

## v0.4.0 Breaking Change

> **Important**: This sample uses `@azure/functions-extensions-servicebus` v0.4.0, which contains a **breaking change** ([Issue #27](https://github.com/Azure/azure-functions-nodejs-extensions/issues/27), [PR #36](https://github.com/Azure/azure-functions-nodejs-extensions/pull/36)):
>
> - **Before (v0.3.x)**: `message.body` was automatically parsed (e.g., JSON strings were parsed into JS objects)
> - **After (v0.4.0)**: `message.body` returns a raw `Buffer` — you must parse it explicitly

## How It Works

When a message is received:
1. **Parse Buffer body** — `message.body` is a `Buffer`, converted to string explicitly (v0.4.0)
2. **Check retry count** — reads `retryCount` from `applicationProperties`
3. **If retries < max** — schedules a new message with incremented retry count (10s delay)
4. **If retries >= max** — sends the message to the **Dead Letter Queue**
5. **Completes** the original message after scheduling the retry

This implements application-level exponential backoff using Service Bus scheduled messages and `DefaultAzureCredential` for keyless authentication.

## Key Features

- **Buffer Body Handling**: Explicitly parses `message.body` from `Buffer` to string (v0.4.0)
- **Scheduled Message Retry**: Uses `ServiceBusClient` to schedule delayed re-delivery
- **Keyless Authentication**: Uses `DefaultAzureCredential` (Managed Identity / `az login`)
- **Dead Letter Queue**: Messages exceeding max retries are dead-lettered
- **Manual Completion**: Full control over message lifecycle

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
az servicebus queue create --name testqueue --namespace-name <your-namespace> --resource-group rg-sb-test --max-delivery-count 10

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

### 4. Send a test message

In a separate terminal:

```bash
node sendTestMessage.js
```

## Key Code Pattern

```typescript
export async function serviceBusQueueTrigger(
    serviceBusMessageContext: ServiceBusMessageContext,
    context: InvocationContext
): Promise<void> {
    const receivedMessage = serviceBusMessageContext.messages[0];

    // v0.4.0: message.body is a Buffer - parse it explicitly
    const bodyBuffer = receivedMessage.body as Buffer;
    const bodyText = bodyBuffer.toString('utf8');

    const currentRetryCount = Number(receivedMessage.applicationProperties?.retryCount) || 0;
    const maxRetries = 3;

    if (currentRetryCount >= maxRetries) {
        // Dead-letter after max retries
        await serviceBusMessageActions.deadletter(receivedMessage);
        return;
    }

    // Schedule a retry with incremented count
    const credential = new DefaultAzureCredential();
    const sbClient = new ServiceBusClient(fullyQualifiedNamespace, credential);
    const sender = sbClient.createSender('testqueue');

    await sender.scheduleMessages([{
        body: bodyText,
        applicationProperties: { retryCount: currentRetryCount + 1 },
        scheduledEnqueueTime: new Date(Date.now() + 10_000),
    }], new Date(Date.now() + 10_000));

    await serviceBusMessageActions.complete(receivedMessage);
}
```

## Expected Behavior

```
[T+0s]  Processing message: backoff-demo-xxx
        Message body (raw text): "This message will fail..."
        Current retry count: 0, Max retries: 3
        Message scheduled with sequence number: 3 (delivery in 10s)
        Original message completed

[T+10s] Processing message: scheduled-backoff-demo-xxx
        Current retry count: 1, Max retries: 3
        Message scheduled with sequence number: 5 (delivery in 10s)
        Original message completed

[T+20s] Processing message: scheduled-scheduled-backoff-demo-xxx
        Current retry count: 2, Max retries: 3
        Message scheduled with sequence number: 7 (delivery in 10s)
        Original message completed

[T+30s] Processing message: scheduled-scheduled-scheduled-backoff-demo-xxx
        Current retry count: 3, Max retries: 3
        Message has exceeded maximum retry count (3). Dead-lettering message.
```

## Configuration Details

### Function Settings

| Setting | Value | Description |
|---------|-------|-------------|
| `sdkBinding` | `true` | Enables advanced Service Bus SDK features |
| `autoCompleteMessages` | `false` | Requires manual message completion |
| `cardinality` | `'many'` | Processes multiple messages per invocation |
| `queueName` | `'testqueue'` | Target Service Bus queue name |

## Migration from v0.3.x

```typescript
// Before (v0.3.x) — body was auto-parsed
const data = message.body; // already a JS object

// After (v0.4.0) — body is a Buffer, parse explicitly
const bodyText = (message.body as Buffer).toString('utf8');
```

## Authentication

This sample uses **keyless authentication** (recommended):

- The Function trigger uses `ServiceBusConnection__fullyQualifiedNamespace` in `local.settings.json`
- The function code uses `DefaultAzureCredential` to create a `ServiceBusClient` for scheduling
- The `sendTestMessage.js` utility also uses `DefaultAzureCredential`
- No connection strings or shared access keys required
- Requires `Azure Service Bus Data Owner` RBAC role on the namespace

## Code Structure

- **Main function**: `serviceBusTopicTrigger.ts` — handles message processing and retry scheduling
- **Test utility**: `sendTestMessage.js` — sends test messages with keyless auth
- **Configuration**: `host.json`, `local.settings.json.example` — function and Service Bus settings

## Notes

- **Scheduled Messages**: The sample uses `ServiceBusClient.scheduleMessages()` for delayed re-delivery
- **Message Body**: Each reschedule passes the body as a string; be aware of potential re-serialization
- **Dead Letter Queue**: Messages exceeding `maxRetries` (3) are sent to DLQ
- **RBAC**: Both the function trigger and the in-code `ServiceBusClient` require the Data Owner role