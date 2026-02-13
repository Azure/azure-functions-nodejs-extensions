# Service Bus Binary Data Access Sample

This sample demonstrates how to access raw binary data from Service Bus messages using `@azure/functions-extensions-servicebus` v0.4.0.

## Background

In v0.4.0, a **breaking change** was introduced ([Issue #27](https://github.com/Azure/azure-functions-nodejs-extensions/issues/27), [PR #36](https://github.com/Azure/azure-functions-nodejs-extensions/pull/36)):

- **Before (v0.3.x)**: `message.body` was automatically parsed based on `contentType` (e.g., `application/json` was parsed via `JSON.parse()`).
- **After (v0.4.0)**: `message.body` is returned as a raw `Buffer`, giving users full control over parsing.

This change enables:
- Custom JSON revivers for special value handling (e.g., preserving large numbers)
- Direct access to raw binary data for non-JSON messages
- Sending unparseable messages to the Dead Letter Queue without retry noise

## What This Sample Demonstrates

1. **Raw Buffer access** — `message.body` is a `Buffer`, not a pre-parsed object
2. **Custom JSON reviver** — Safe number handling to detect values outside `Number.MAX_SAFE_INTEGER`
3. **Dead Letter Queue** — Invalid/non-JSON messages are sent to DLQ instead of retrying

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

Edit `local.settings.json` to set your namespace:

```json
{
  "Values": {
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

In a separate terminal:

```bash
# Send all test messages (JSON, large number, binary)
node sendTestMessage.js

# Or send specific types:
node sendTestMessage.js json          # Normal JSON
node sendTestMessage.js largeNumber   # JSON with large numbers
node sendTestMessage.js binary        # Non-JSON binary (goes to DLQ)
```

## Key Code Pattern

```typescript
export async function serviceBusBinaryDataTrigger(
    sbContext: ServiceBusMessageContext,
    context: InvocationContext
): Promise<void> {
    const message = sbContext.messages[0];

    // v0.4.0: message.body is a raw Buffer
    const rawBuffer: Buffer = message.body as Buffer;
    const bodyText = rawBuffer.toString('utf8');

    try {
        // Parse with custom reviver for special handling
        const data = JSON.parse(bodyText, myCustomReviver);
        await sbContext.actions.complete(message);
    } catch (error) {
        // Non-parseable messages go to Dead Letter Queue
        await sbContext.actions.deadletter(message);
    }
}
```

## Migration from v0.3.x

If you are upgrading from v0.3.x, update your message body handling:

```typescript
// Before (v0.3.x) — body was auto-parsed
const data = message.body; // already a JS object

// After (v0.4.0) — body is a Buffer, parse explicitly
const data = JSON.parse((message.body as Buffer).toString('utf8'));
```

## Authentication

This sample uses **keyless authentication** (recommended):

- The Function trigger uses `ServiceBusConnection__fullyQualifiedNamespace` in `local.settings.json`
- The test message sender uses `DefaultAzureCredential` from `@azure/identity`
- No connection strings or shared access keys required
- Requires `Azure Service Bus Data Owner` RBAC role on the namespace
