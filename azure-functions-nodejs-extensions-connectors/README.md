# @azure/functions-extensions-connectors

Azure Functions extension for Azure Logic Apps connectors. Provides strongly-typed SDK bindings for connector triggers with automatic payload normalization, connector-specific context types, and a first-class `connectors` namespace API.

## Installation

```bash
npm install @azure/functions-extensions-connectors @azure/connectors @azure/functions
```

## Quick Start

```typescript
import { connectors } from '@azure/functions-extensions-connectors';

connectors.office365.onNewEmail('OnNewEmail', {
    handler: async (context, invocationContext) => {
        // context.emails is GraphClientReceiveMessage[] — fully typed, zero annotations needed
        for (const email of context.emails) {
            invocationContext.log(`Subject: '${email.subject}'.`);
        }
    },
});
```

Or with explicit type annotations:

```typescript
import { connectors, EmailTriggerContext } from '@azure/functions-extensions-connectors';
import { InvocationContext } from '@azure/functions';

connectors.office365.onNewEmail('OnNewEmail', {
    handler: async (context: EmailTriggerContext, invocationContext: InvocationContext) => {
        for (const email of context.emails) {
            invocationContext.log(`Subject: '${email.subject}'.`);
        }
    },
});
```

## Supported Connectors

| Registration | Context Type | Named Property | Item Type |
|---|---|---|---|
| `connectors.office365.onNewEmail()` | `EmailTriggerContext` | `emails` | `GraphClientReceiveMessage[]` |
| `connectors.office365.onNewCalendarEvent()` | `CalendarEventTriggerContext` | `calendarEvents` | `GraphCalendarEventClientReceive[]` |
| `connectors.sharepoint.onNewFile()` | `FileTriggerContext` | `files` | `BlobMetadata[]` |
| `connectors.sharepoint.onUpdatedFile()` | `FileTriggerContext` | `files` | `BlobMetadata[]` |
| `connectors.teams.onNewChannelMessage()` | `ChannelMessageTriggerContext` | `messages` | `ChatMessage[]` |
| `connectors.kusto.onQueryResult()` | `QueryResultTriggerContext` | `rows` | `Row[]` |

Each named property is an alias for `context.items` — the generic accessor still works.

## Generic Registration

For connectors not yet in the `connectors` namespace, use the generic `connectorTrigger()`:

```typescript
import { connectorTrigger } from '@azure/functions-extensions-connectors';

connectorTrigger<MyItemType>('MyFunction', {
    handler: async (context, invocationContext) => {
        for (const item of context.items) { /* fully typed */ }
    },
});
```

## Configure App Settings

Add the connector connection runtime URL to your `local.settings.json`:

```json
{
    "Values": {
        "Office365Connection": "<your-connector-runtime-url>"
    }
}
```

## How It Works

1. **`connectorTrigger()`** wraps `app.connectorTrigger()` from `@azure/functions` with payload normalization into a typed `ConnectorTriggerContext`.
2. When the Connector Gateway fires the trigger callback, the wrapper parses the JSON payload and normalizes batch/single-item formats into a consistent `items` array.
3. Connector-specific wrappers (e.g., `onNewEmail`) add named aliases (`emails`, `files`, etc.) to the context for better readability.
4. Malformed payloads are logged as warnings via `InvocationContext.warn()` and produce empty contexts (the handler still runs).

## API Reference

### `ConnectorTriggerContext<TItem>`

| Property | Type | Description |
|----------|------|-------------|
| `payload` | `TriggerCallbackPayload<TItem>` | Normalized envelope with `body.value` as `TItem[]` |
| `items` | `TItem[]` | Convenience accessor for `payload.body.value` |
| `rawPayload` | `unknown` | Original payload as received from the host |
| `toJSON()` | `string` | Serializes the full trigger payload to JSON |

### `ConnectorTriggerOptions<TItem, TContext>`

| Option | Type | Description |
|--------|------|-------------|
| `handler` | `ConnectorTriggerHandler<TItem, TContext>` | Async handler receiving the trigger context and `InvocationContext` |
| `extraInputs` | `FunctionInput[]` | Optional extra input bindings |
| `extraOutputs` | `FunctionOutput[]` | Optional extra output bindings |
| `return` | `FunctionOutput` | Optional return output binding |

### Exported Types

All connector SDK item types are re-exported for convenience:

- `GraphClientReceiveMessage`, `GraphCalendarEventClientReceive` (Office 365)
- `BlobMetadata` (SharePoint)
- `ChatMessage` (Teams)
- `KustoRow` (Kusto)
- `TriggerCallbackPayload`, `TriggerCallbackBody`

### Context Types

- `EmailTriggerContext` — adds `emails: GraphClientReceiveMessage[]`
- `CalendarEventTriggerContext` — adds `calendarEvents: GraphCalendarEventClientReceive[]`
- `FileTriggerContext` — adds `files: BlobMetadata[]`
- `ChannelMessageTriggerContext` — adds `messages: ChatMessage[]`
- `QueryResultTriggerContext` — adds `rows: Row[]`

## License

MIT
