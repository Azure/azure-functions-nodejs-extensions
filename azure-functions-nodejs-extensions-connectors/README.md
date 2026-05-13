# @azure/functions-extensions-connectors

Azure Functions extension for Azure Logic Apps connectors. Provides SDK binding support for connector triggers with typed payloads using the `@azure/connectors` library.

## Installation

```bash
npm install @azure/functions-extensions-connectors @azure/connectors @azure/functions
```

## Usage

### 1. Register a connector trigger function

```typescript
import { InvocationContext } from '@azure/functions';
import { connectorTrigger, GraphClientReceiveMessage } from '@azure/functions-extensions-connectors';

connectorTrigger<GraphClientReceiveMessage>('OnNewEmail', {
    connection: 'Office365Connection',
    connector: 'office365',
    triggerOperation: 'OnNewEmail',
    handler: async (triggerContext, context: InvocationContext) => {
        // triggerContext.items is GraphClientReceiveMessage[] — fully typed, no cast needed
        for (const email of triggerContext.items) {
            context.log(`Subject: '${email.subject}'.`);
        }
    },
});
```

### 2. Configure app settings

Add the connector connection runtime URL to your `local.settings.json`:

```json
{
    "Values": {
        "Office365Connection": "<your-connector-runtime-url>"
    }
}
```

## How It Works

1. **`connectorTrigger()`** wraps `app.connectorTrigger()` with payload normalisation into a typed `ConnectorTriggerContext`
2. When AI Gateway fires the trigger callback, the wrapper parses the JSON payload and normalises batch/single-item formats
3. Your handler receives `ConnectorTriggerContext` with `.items` (the trigger data array), `.payload` (the normalised envelope), and `.rawPayload` (the original data)

## API

### `connectorTrigger(name, options)`

| Option | Type | Description |
|--------|------|-------------|
| `connection` | `string` | App setting name for the connector runtime URL |
| `connector` | `string` | Connector name (e.g., `'office365'`, `'sharepointonline'`) |
| `triggerOperation` | `string` | Trigger operation name (e.g., `'OnNewEmail'`) |
| `handler` | `ConnectorTriggerHandler<TItem>` | Async handler receiving `ConnectorTriggerContext` and `InvocationContext` |
| `extraInputs` | `FunctionInput[]` | Optional extra input bindings |
| `extraOutputs` | `FunctionOutput[]` | Optional extra output bindings |
| `return` | `FunctionOutput` | Optional return output binding |

### `ConnectorTriggerContext<TItem>`

| Property | Type | Description |
|----------|------|-------------|
| `payload` | `TriggerCallbackPayload<TItem>` | Full trigger callback envelope |
| `items` | `TItem[]` | Convenience accessor for `payload.body.value` |
| `rawPayload` | `unknown` | Original payload as received from the host |
| `toJSON()` | `string` | Serialises the full trigger payload to JSON |

## License

MIT
