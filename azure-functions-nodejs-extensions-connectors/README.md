# @azure/functions-extensions-connectors

Azure Functions extension for Azure Logic Apps connectors. Provides strongly-typed SDK bindings for connector triggers with automatic payload normalization, connector-specific context types, and a first-class `connectors` namespace API.

## Installation

Requires Node.js 22 or later.

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

### Additional Typed Trigger Registrations

These registrations cover every trigger callback payload alias exported by
`@azure/connectors` **0.4.0-preview** for the eight connectors below. Registration
names follow the SDK trigger operation names, with a lowercase initial letter.
The existing helpers in the table above remain compatible.

| Connector namespace | Registrations | Context type | Named property / SDK item type |
|---|---|---|---|
| `office365` | `onCalendarNewItems`, `onCalendarUpdatedItems`, `onUpcomingEvents` | `CalendarEventTriggerContext` | `calendarEvents: GraphCalendarEventClientReceive[]` |
| `office365` | `onCalendarChangedItems` | `CalendarChangedEventTriggerContext` | `calendarEvents: GraphCalendarEventClientWithActionType[]` |
| `office365` | `onFlaggedEmail`, `onNewEmailMentioningMe`, `onSharedMailboxNewEmail` | `EmailTriggerContext` | `emails: GraphClientReceiveMessage[]` |
| `sharepoint` | `onChangedItems`, `onNewItems`, `onNewItemsFromForm`, `onRecurrenceDigest`, `onUpdatedItems` | `SharepointItemTriggerContext` | `records: SharepointItem[]` |
| `sharepoint` | `onNewFileItems`, `onUpdatedFileItems`, `onUpdatedFileClassifiedTimes` | `SharepointItemTriggerContext` | `records: SharepointItem[]` |
| `sharepoint` | `onDeletedFileItems`, `onDeletedItems` | `DeletedItemTriggerContext` | `deletedItems: DeletedItem[]` |
| `onedriveforbusiness` | `onNewFiles`, `onUpdatedFiles` | `OneDriveFileTriggerContext` | `files: OneDriveBlobMetadata[]` |
| `teams` | `onNewChannelMessageMentioningMe` | `ChannelMessageTriggerContext` | `messages: ChatMessage[]` |
| `teams` | `onTeamMemberAdded`, `onTeamMemberRemoved` | `TeamMemberTriggerContext` | `members: Record<string, unknown>[]` |
| `planner` | `onCompleteTask`, `onNewTask`, `onTaskAssignedToMe` | `PlannerTaskTriggerContext` | `tasks: PlannerTask[]` |
| `salesforce` | `onNewItems`, `onUpdatedItems` | `SalesforceRecordTriggerContext` | `records: SalesforceItem[]` |
| `vsts` (Azure DevOps) | `onBuildCompleted` | `BuildCompletedTriggerContext` | `builds: BuildResult[]` |
| `vsts` (Azure DevOps) | `onGitPullClosed`, `onGitPullCreated` | `GitPullRequestTriggerContext` | `pullRequests: GitPullRequest[]` |
| `vsts` (Azure DevOps) | `onGitPush` | `GitPushTriggerContext` | `pushes: GitPush[]` |
| `vsts` (Azure DevOps) | `onTfvcCheckIn` | `TfvcChangesetTriggerContext` | `changesets: TfvcChangeset[]` |
| `vsts` (Azure DevOps) | `onWorkItemAssigned`, `onWorkItemClosed`, `onWorkItemCreated`, `onWorkItemUpdated` | `WorkItemTriggerContext` | `workItems: TriggerWorkItemResponse[]` |
| `dataflows` | `onRefreshComplete` | `DataflowRefreshTriggerContext` | `refreshes: RefreshModel[]` |

`onCalendarNewItems` is an alias for `onNewCalendarEvent`. SharePoint
file-property triggers (`onNewFileItems` / `onUpdatedFileItems`) use the SDK's
dynamic `Item` model, **not** `BlobMetadata`. The existing `onNewFile` and
`onUpdatedFile` helpers retain their original metadata context.

The SDK does not describe every connector payload with a concrete model:

- Teams membership events retain `Record<string, unknown>`; custom fields must
  be narrowed before use.
- SharePoint and Salesforce records retain the SDK's `dynamicProperties`
  representation. No fixed list or Salesforce object schema is invented.
- Dataflows does not export a callback envelope alias. This extension exports
  `DataflowsOnRefreshCompleteTriggerPayload = TriggerCallbackPayload<RefreshModel>`
  for the **normalized** context, using the SDK's refresh result model.
- OneDrive `OnNewFile` / `OnUpdatedFile` return file content, not the metadata
  batches represented by `OnNewFiles` / `OnUpdatedFiles`. No new metadata
  helpers are provided for those content operations.
- Teams recording, transcript, and webhook operations have no callback payload
  aliases in this SDK version. They are not represented as strongly typed
  registrations here; use the generic helper with a verified application type
  for object payloads.

These helpers register Functions handlers; they do not create or select a
remote connector subscription. Configure the matching SDK trigger operation
and route it to the registered function name separately.

```typescript
import {
    connectors,
    PlannerOnNewTaskTriggerPayload,
} from '@azure/functions-extensions-connectors';

connectors.planner.onNewTask('OnPlannerTask', {
    handler: async (context, invocationContext) => {
        const payload: PlannerOnNewTaskTriggerPayload = context.payload;
        for (const task of context.tasks) {
            invocationContext.log(task.title, task.percentComplete);
        }
        return payload;
    },
});
```

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

## Polling and Batching

The generic `connectorTrigger()` and **all** named helpers accept the same
polling and batching options from `@azure/functions` 4.17.0 or later:

```typescript
import { connectors } from '@azure/functions-extensions-connectors';

connectors.office365.onNewEmail('OnNewEmail', {
    deliveryMode: 'Poll',
    connection: 'ConnectorNamespace',
    triggerConfigName: 'email-poll',
    cardinality: 'many',
    maxBatchSize: 100,
    handler: async (context, invocationContext) => {
        for (const email of context.emails) {
            invocationContext.log(email.subject);
        }
    },
});
```

`connection` and `triggerConfigName` are required by the host for `Poll` delivery.
Omitting `deliveryMode` retains the host's default `Webhook` behavior. Use
`cardinality: 'many'` for batched invocations; omit it or use `'one'` for
single-event invocations.

Polling batches such as `[{ body: event1 }, { body: event2 }]` are normalized
into one context with `items: [event1, event2]`. Each envelope may instead contain
`body.value`, and those item arrays are combined in envelope and item order.
Object inputs and JSON strings are both supported. The handler runs once per
invocation, and `payload.body.value` and the connector-specific alias reference
the same combined `items` array. The complete original parsed envelope array,
including metadata, remains available through `rawPayload` and `toJSON()`.

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
2. When the Connector Gateway fires the trigger callback, the wrapper parses the JSON payload and normalizes batch/single-item envelopes and polling envelope arrays into a consistent `items` array.
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
| `deliveryMode` | `'Poll' \| 'Webhook'` | Optional delivery mode; the host defaults to `Webhook` |
| `connection` | `string` | Connector connection setting; required by the host for `Poll` |
| `triggerConfigName` | `string` | Trigger configuration name or app setting expression; required by the host for `Poll` |
| `cardinality` | `'one' \| 'many'` | Set to `many` for batching; defaults to `one` |
| `maxBatchSize` | `number` | Optional per-function batch size limit; otherwise uses the host default |
| `maxConcurrentCalls` | `number` | Optional concurrency limit for single-event invocations; batches are processed one at a time by the extension |
| `targetPendingEventThreshold` | `number` | Target pending event count per function instance for scaling |
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

All 38 SDK `*TriggerPayload` aliases for Office 365, SharePoint Online,
OneDrive for Business, Teams, Planner, Salesforce and VSTS are re-exported
under their original SDK names (for example,
`Office365OnNewEmailTriggerPayload`, `SharepointonlineOnNewFileItemsTriggerPayload`,
`OnedriveforbusinessOnNewFilesTriggerPayload`, `TeamsOnTeamMemberAddedTriggerPayload`,
`PlannerOnNewTaskTriggerPayload`, `SalesforceOnNewItemsTriggerPayload`, and
`VisualstudioteamservicesOnWorkItemCreatedTriggerPayload`).

Additional item type exports are `GraphCalendarEventClientWithActionType`,
`DeletedItem`, `SharepointItem`, `OneDriveBlobMetadata`, `PlannerTask`,
`SalesforceItem`, `BuildResult`, `GitPullRequest`, `GitPush`, `TfvcChangeset`,
`TriggerWorkItemResponse` and `RefreshModel`. Aliases avoid collisions between
the different SDK `Item` and `BlobMetadata` definitions. All new context and
connector registration interfaces in the table above are also exported.

### Context Types

- `EmailTriggerContext` — adds `emails: GraphClientReceiveMessage[]`
- `CalendarEventTriggerContext` — adds `calendarEvents: GraphCalendarEventClientReceive[]`
- `FileTriggerContext` — adds `files: BlobMetadata[]`
- `ChannelMessageTriggerContext` — adds `messages: ChatMessage[]`
- `QueryResultTriggerContext` — adds `rows: Row[]`

## Development Checks

Use Node.js 22 or later and run from the connectors extension directory:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run minify
```

The type check includes compile-only tests that compare every typed
registration payload with its SDK alias, verify the public payload exports,
and reject invalid item properties. Runtime tests cover all registrations
with batched, single-item, polling envelope array, JSON-string, missing and malformed payloads, binding
passthrough, falsy return values, registration and handler errors, frozen options,
and isolated registrations and overlapping invocations. Connector-specific
fixtures verify nested SDK fields, dynamic properties, field casing, optional
fields, item ordering and preservation of falsy values. Compile-only tests also
check named alias types across the source and published declarations and reject
handlers for the wrong connector. Polling and webhook options are checked for
every named registration, including Kusto, and invalid polling option types
are rejected by compile-only tests.

### Continuous Integration

The [official build](../eng/ci/official-build.yml) and
[public build](../eng/ci/public-build.yml) build and package this extension
using Node.js 24. The official build publishes an
`azure-functions-nodejs-extensions-connectors` package artifact.

The shared test job runs lint, type checks, and `npm run test:ci` for Connectors
on Node.js 22 and 24. Official builds run these checks on Windows and Linux;
public builds run them on Windows. `npm run test:ci` runs the same tests as `npm test` and writes the JUnit
report to `test/unit-test-results.xml` for pipeline test-result publishing.

## License

MIT
