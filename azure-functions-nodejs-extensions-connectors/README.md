# @azure/functions-extensions-connectors

Azure Functions extension for Azure Logic Apps connectors. Provides SDK binding support for connector triggers with typed payloads using the `@azure/connectors` library.

## Installation

```bash
npm install @azure/functions-extensions-connectors @azure/connectors @azure/functions
```

## Usage

### 1. Import the extension in your entry point

```typescript
import '@azure/functions-extensions-connectors';
import { app } from '@azure/functions';

app.setup({ enableHttpStream: true });
```

### 2. Register a connector trigger function

```typescript
import { InvocationContext } from '@azure/functions';
import { connectorTrigger, ConnectorTriggerContext } from '@azure/functions-extensions-connectors';
import { GraphClientReceiveMessage } from '@azure/connectors';

connectorTrigger('OnNewEmail', {
    connection: 'Office365Connection',
    connector: 'office365',
    triggerOperation: 'OnNewEmail',
    handler: async (triggerContext: ConnectorTriggerContext, context: InvocationContext) => {
        const emails = triggerContext.items as GraphClientReceiveMessage[];
        for (const email of emails) {
            context.log(`Subject: '${email.subject}'.`);
        }
    },
});
```

### 3. Configure app settings

Add the connector connection runtime URL to your `local.settings.json`:

```json
{
    "Values": {
        "Office365Connection": "<your-connector-runtime-url>"
    }
}
```

## How It Works

1. **Side-effect import** registers a `ConnectorTrigger` factory with `ResourceFactoryResolver`
2. **`connectorTrigger()`** wraps `app.generic()` with `type: "connectorTrigger"` binding
3. When AI Gateway fires the trigger callback, the factory parses the JSON payload into a typed `ConnectorTriggerContext`
4. Your handler receives `ConnectorTriggerContext` with `.items` (the trigger data array) and `.payload` (the full envelope)

## API

### `connectorTrigger(name, options)`

| Option | Type | Description |
|--------|------|-------------|
| `connection` | `string` | App setting name for the connector runtime URL |
| `connector` | `string` | Connector name (e.g., `'office365'`, `'sharepoint'`) |
| `triggerOperation` | `string` | Trigger operation name (e.g., `'OnNewEmail'`) |
| `sdkBinding` | `boolean` | Enable SDK binding mode (default: `true`) |
| `handler` | `Function` | Async handler receiving `ConnectorTriggerContext` and `InvocationContext` |

### `ConnectorTriggerContext<TItem>`

| Property | Type | Description |
|----------|------|-------------|
| `payload` | `TriggerCallbackPayload<TItem>` | Full trigger callback envelope |
| `items` | `TItem[]` | Convenience accessor for `payload.body.value` |

## License

MIT
