# Azure Functions Connectors extension for Node.js

`@azure/functions-extensions-connectors` adds typed registration helpers for
Azure Functions connector triggers. It wraps `app.connectorTrigger()` from
`@azure/functions`, normalizes connector event envelopes, and exposes the
resulting items using types from the Azure Connectors SDK.

The package and connector support are in preview.

[Package metadata](package.json) | [Changelog](CHANGELOG.md) |
[Samples](samples/README.md) |
[Azure Connectors SDK](https://github.com/Azure/Connectors-NodeJS-SDK) |
[Python extension](https://github.com/Azure/azure-functions-python-extensions/tree/dev/azurefunctions-extensions-connectors)

## Getting started

### Prerequisites

- Node.js 24 or later and npm.
- An Azure Functions app using `@azure/functions` 4.17.0 or later, the Node.js
  programming model v4, and a Functions host with the connector extension.
- For local execution, [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
  v4 and host storage. Start Azurite if the app uses `UseDevelopmentStorage=true`.
- For live events, an Azure subscription, a configured Connector Namespace,
  an authorized connection, and access to the selected connector and its data.
  The remote trigger configuration and its permissions must be set up separately.
- For polling, a host/connector extension version and remote trigger
  configuration that support poll delivery.

The included [sample host configuration](samples/connectorTriggerSample/host.json)
uses the experimental Functions extension bundle. Confirm that the bundle
version available in your environment contains the connector and polling
features you intend to use.

### Install the package

For the release described by this README:

```sh
npm install @azure/functions-extensions-connectors@0.2.0-preview @azure/functions@^4.17.0
```

The extension declares `@azure/connectors ^0.4.0-preview` as a dependency. Install
the SDK directly too if your app imports its generated clients or types.

> These preview versions must be present in your configured npm registry.
> Until they are published, use a registry containing both previews or install
> compatible SDK and extension packages built from source. An `ETARGET` error
> means the requested version was not found in the configured registry. The
> checked-in lockfiles may need to be refreshed after the previews are published.

### Register a typed handler

```typescript
import { connectors } from '@azure/functions-extensions-connectors';

connectors.office365.onNewEmail('OnNewEmail', {
    handler: async (context, invocationContext) => {
        invocationContext.log(`Received ${context.emails.length} email(s).`);
    },
});
```

The handler receives a typed `EmailTriggerContext`; `context.emails` is the
same array as `context.items`. The function name identifies the Functions
handler. Registering it does **not** create a Connector Namespace, authorize a
connection, or create a remote trigger.

For webhook delivery, configure the remote trigger to call the matching
function. The connector webhook endpoint uses a `connector_extension` system
key; treat it as a secret and do not commit callback credentials. For polling,
configure a compatible remote poll-delivery trigger and the host connection
setting, then reference the trigger configuration in the function options
below. Poll delivery does not use a consumer webhook callback.

## Key concepts

### Trigger context and payloads

Every helper invokes its handler once per Functions invocation with a
`ConnectorTriggerContext<TItem>` and an `InvocationContext`. The context has:

| Property | Description |
|---|---|
| `items` | Normalized `TItem[]`, including for single-event invocations. |
| `payload` | Normalized `TriggerCallbackPayload<TItem>`; `payload.body.value` is the same array as `items`. |
| `rawPayload` | The parsed input before extraction, including envelope metadata. Object inputs retain their original reference. |
| `toJSON()` | JSON serialization of `rawPayload`; original JSON whitespace is not preserved. |

Connector-specific properties such as `emails`, `records`, and `tasks` are
aliases of `items`, not separate copies. The following input shapes are
supported as objects or JSON strings:

| Host input | Normalized `items` |
|---|---|
| `{ body: itemA }` | `[itemA]` |
| `{ body: { value: [itemA, itemB] } }` | `[itemA, itemB]` |
| `[{ body: itemA }, { body: { value: [itemB, itemC] } }]` | `[itemA, itemB, itemC]` |
| `[]` or `{ body: { value: [] } }` | `[]` |

Polling envelope arrays are flattened in delivery order. The normalized
`payload` contains the resulting items, not the original envelope metadata;
use `rawPayload` when that metadata is needed. Missing, null, empty, or
non-object bodies contribute no items, including within a polling array.
Malformed JSON and a JSON `null` payload produce a warning and an empty context;
the handler still runs. A JavaScript `null` or `undefined` input becomes an
empty raw object.

SDK types provide **compile-time** shape information. The wrapper does not
validate incoming fields, instantiate SDK classes, fetch pages, or convert
property names. Narrow dynamic fields and validate untrusted data before use.
An item body with an array-valued `value` property is treated as an envelope
of items; use `rawPayload` if the complete original input is required.

### Cardinality and delivery mode

`deliveryMode` defaults to `Webhook` when omitted. Set it to `Poll` for a
poll-enabled trigger configuration. The host requires both `connection` and
`triggerConfigName` for polling.

`cardinality: 'one'` selects single-event invocations; `'many'` enables
polling batches. In either case, this package supplies an array in `items`
and in the named alias. An individual event envelope can itself contain a
`body.value` array, regardless of the host cardinality. The helper does not
choose the remote connector operation or configure its source-side split-on
behavior.

## Supported connector triggers

The tables list the Node.js helper, remote SDK operation identifier, context
type, and named item alias. Helper names are not always remote operation IDs.
All helpers also expose `context.items`; all accept the options in the
[API reference](#connectortriggeroptionstitem-tcontext).

### Office 365 (`office365`)

| Helper | Connector operation | Context | Named items |
|---|---|---|---|
| `onNewEmail` | `OnNewEmailV3` | `EmailTriggerContext` | `emails: GraphClientReceiveMessage[]` |
| `onFlaggedEmail` | `OnFlaggedEmailV4` | `EmailTriggerContext` | `emails: GraphClientReceiveMessage[]` |
| `onNewEmailMentioningMe` | `OnNewMentionMeEmailV3` | `EmailTriggerContext` | `emails: GraphClientReceiveMessage[]` |
| `onSharedMailboxNewEmail` | `SharedMailboxOnNewEmailV2` | `EmailTriggerContext` | `emails: GraphClientReceiveMessage[]` |
| `onNewCalendarEvent` | `CalendarGetOnNewItemsV3` | `CalendarEventTriggerContext` | `calendarEvents: GraphCalendarEventClientReceive[]` |
| `onCalendarNewItems` | `CalendarGetOnNewItemsV3` | `CalendarEventTriggerContext` | `calendarEvents: GraphCalendarEventClientReceive[]` |
| `onCalendarUpdatedItems` | `CalendarGetOnUpdatedItemsV3` | `CalendarEventTriggerContext` | `calendarEvents: GraphCalendarEventClientReceive[]` |
| `onUpcomingEvents` | `OnUpcomingEventsV3` | `CalendarEventTriggerContext` | `calendarEvents: GraphCalendarEventClientReceive[]` |
| `onCalendarChangedItems` | `CalendarGetOnChangedItemsV3` | `CalendarChangedEventTriggerContext` | `calendarEvents: GraphCalendarEventClientWithActionType[]` |

`onCalendarNewItems` is an alias for `onNewCalendarEvent`, not a separate
remote operation. Calendar-change fields use the SDK's case-sensitive names,
including `ActionType`.

### SharePoint Online (`sharepoint`)

| Helper | Connector operation | Context | Named items |
|---|---|---|---|
| `onChangedItems` | `GetOnChangedItems` | `SharepointItemTriggerContext` | `records: SharepointItem[]` |
| `onNewItems` | `GetOnNewItems` | `SharepointItemTriggerContext` | `records: SharepointItem[]` |
| `onNewItemsFromForm` | `GetOnNewItemsFromForm` | `SharepointItemTriggerContext` | `records: SharepointItem[]` |
| `onRecurrenceDigest` | `GetOnRecurrenceDigest` | `SharepointItemTriggerContext` | `records: SharepointItem[]` |
| `onUpdatedItems` | `GetOnUpdatedItems` | `SharepointItemTriggerContext` | `records: SharepointItem[]` |
| `onNewFileItems` | `GetOnNewFileItems` | `SharepointItemTriggerContext` | `records: SharepointItem[]` |
| `onUpdatedFileItems` | `GetOnUpdatedFileItems` | `SharepointItemTriggerContext` | `records: SharepointItem[]` |
| `onUpdatedFileClassifiedTimes` | `GetOnUpdatedFileClassifiedTimes` | `SharepointItemTriggerContext` | `records: SharepointItem[]` |
| `onDeletedFileItems` | `GetOnDeletedFileItems` | `DeletedItemTriggerContext` | `deletedItems: DeletedItem[]` |
| `onDeletedItems` | `GetOnDeletedItems` | `DeletedItemTriggerContext` | `deletedItems: DeletedItem[]` |
| `onNewFile` | `OnNewFile` | `FileTriggerContext` | `files: BlobMetadata[]` |
| `onUpdatedFile` | `OnUpdatedFile` | `FileTriggerContext` | `files: BlobMetadata[]` |

List and file-property helpers use the SDK's dynamic `SharepointItem`
representation; custom fields require narrowing. The legacy `onNewFile` and
`onUpdatedFile` helpers retain their `BlobMetadata` context. Verify the
selected operation's callback shape; the wrapper does not download file content.

### OneDrive for Business (`onedriveforbusiness`)

| Helper | Connector operation | Context | Named items |
|---|---|---|---|
| `onNewFiles` | `OnNewFilesV2` | `OneDriveFileTriggerContext` | `files: OneDriveBlobMetadata[]` |
| `onUpdatedFiles` | `OnUpdatedFilesV2` | `OneDriveFileTriggerContext` | `files: OneDriveBlobMetadata[]` |

These are metadata operations. The singular `OnNewFileV2` and
`OnUpdatedFileV2` operations return file content and are not represented by
these metadata helpers.

### Microsoft Teams (`teams`)

| Helper | Connector operation | Context | Named items |
|---|---|---|---|
| `onNewChannelMessage` | `OnNewChannelMessage` | `ChannelMessageTriggerContext` | `messages: ChatMessage[]` |
| `onNewChannelMessageMentioningMe` | `OnNewChannelMessageMentioningMe` | `ChannelMessageTriggerContext` | `messages: ChatMessage[]` |
| `onTeamMemberAdded` | `OnGroupMembershipAdd` | `TeamMemberTriggerContext` | `members: Record<string, unknown>[]` |
| `onTeamMemberRemoved` | `OnGroupMembershipRemoval` | `TeamMemberTriggerContext` | `members: Record<string, unknown>[]` |

Member fields are dynamic. Teams recording, transcript, and webhook
notification operations do not have named helpers in this package; use the
generic helper only after verifying the callback shape and item type.

### Planner (`planner`)

| Helper | Connector operation | Context | Named items |
|---|---|---|---|
| `onCompleteTask` | `OnCompleteTask_V3` | `PlannerTaskTriggerContext` | `tasks: PlannerTask[]` |
| `onNewTask` | `OnNewTask_V3` | `PlannerTaskTriggerContext` | `tasks: PlannerTask[]` |
| `onTaskAssignedToMe` | `OnTaskAssignedToMe_V2` | `PlannerTaskTriggerContext` | `tasks: PlannerTask[]` |

`PlannerTask` is the SDK's `GetTaskResponseV2` type. The array contains tasks,
not the source list-response envelope.

### Salesforce (`salesforce`)

| Helper | Connector operation | Context | Named items |
|---|---|---|---|
| `onNewItems` | `GetOnNewItems` | `SalesforceRecordTriggerContext` | `records: SalesforceItem[]` |
| `onUpdatedItems` | `GetOnUpdatedItems` | `SalesforceRecordTriggerContext` | `records: SalesforceItem[]` |

The selected Salesforce object determines the dynamic fields. The wrapper does
not invent a fixed record schema or fetch additional pages.

### Azure DevOps (`vsts`)

| Helper | Connector operation | Context | Named items |
|---|---|---|---|
| `onBuildCompleted` | `OnBuildCompleted` | `BuildCompletedTriggerContext` | `builds: BuildResult[]` |
| `onGitPullClosed` | `OnGitPullClosed` | `GitPullRequestTriggerContext` | `pullRequests: GitPullRequest[]` |
| `onGitPullCreated` | `OnGitPullCreated` | `GitPullRequestTriggerContext` | `pullRequests: GitPullRequest[]` |
| `onGitPush` | `OnGitPush` | `GitPushTriggerContext` | `pushes: GitPush[]` |
| `onTfvcCheckIn` | `OnTfvcCheckIn` | `TfvcChangesetTriggerContext` | `changesets: TfvcChangeset[]` |
| `onWorkItemAssigned` | `OnWorkItemAssignedV2` | `WorkItemTriggerContext` | `workItems: TriggerWorkItemResponse[]` |
| `onWorkItemClosed` | `OnWorkItemClosedV2` | `WorkItemTriggerContext` | `workItems: TriggerWorkItemResponse[]` |
| `onWorkItemCreated` | `OnWorkItemCreatedV2` | `WorkItemTriggerContext` | `workItems: TriggerWorkItemResponse[]` |
| `onWorkItemUpdated` | `OnWorkItemUpdatedV2` | `WorkItemTriggerContext` | `workItems: TriggerWorkItemResponse[]` |

The remote connector ID is `visualstudioteamservices`. Work-item `fields` are
dynamic and retain their SDK/wire names.

### Dataflows (`dataflows`)

| Helper | Connector operation | Context | Named items |
|---|---|---|---|
| `onRefreshComplete` | `OnRefreshComplete` | `DataflowRefreshTriggerContext` | `refreshes: RefreshModel[]` |

The extension exports `DataflowsOnRefreshCompleteTriggerPayload` for the
normalized context because the SDK does not export a callback-envelope alias
for this operation.

### Kusto (`kusto`)

| Helper | Connector operation | Context | Named items |
|---|---|---|---|
| `onQueryResult` | Not an SDK trigger operation | `QueryResultTriggerContext` | `rows: KustoRow[]` |

The helper accepts compatible query-result callbacks; it does not run a query
or create a Kusto subscription. This SDK does not provide a Kusto trigger
operation for the helper. Row columns have unknown types until narrowed.

For other connectors, including Dataverse/CDS, no named helper is provided.
Use the generic helper with a verified object payload shape and item type.

## Examples

### Polling with batched Office 365 messages

```typescript
import { connectors } from '@azure/functions-extensions-connectors';

connectors.office365.onNewEmail('OnNewEmailPoll', {
    deliveryMode: 'Poll',
    connection: 'ConnectorNamespace',
    triggerConfigName: 'email-poll',
    cardinality: 'many',
    maxBatchSize: 100,
    handler: async (context, invocationContext) => {
        invocationContext.log(`Received ${context.emails.length} email(s).`);
    },
});
```

`ConnectorNamespace` identifies the connection setting configured for the
host; `email-poll` is the remote trigger configuration name. These are
examples, not credentials or resources created by the helper. Replace them
with your own configured values. `triggerConfigName` can also use an app
setting expression such as `%EmailTriggerConfig%`.

### Planner task callback

```typescript
import { connectors } from '@azure/functions-extensions-connectors';
import type { PlannerOnNewTaskTriggerPayload } from '@azure/functions-extensions-connectors';

connectors.planner.onNewTask('OnPlannerTask', {
    handler: async (context, invocationContext) => {
        const payload: PlannerOnNewTaskTriggerPayload = context.payload;
        invocationContext.log(`Received ${context.tasks.length} task(s).`);
        return payload;
    },
});
```

### Generic registration

For a connector without a named helper, specify the item type after verifying
that the actual event uses the supported envelope shapes:

```typescript
import { connectorTrigger } from '@azure/functions-extensions-connectors';

interface MyItem {
    id: string;
}

connectorTrigger<MyItem>('MyFunction', {
    handler: async (context, invocationContext) => {
        invocationContext.log(`Received ${context.items.length} item(s).`);
    },
});
```

## API reference

### `ConnectorTriggerOptions<TItem, TContext>`

The generic registration and all named helpers use the same options. The
polling/batching property types come from `@azure/functions`.

| Option | Type | Description |
|---|---|---|
| `handler` | `ConnectorTriggerHandler<TItem, TContext>` | Async handler receiving the normalized context and `InvocationContext`. |
| `deliveryMode` | `'Poll' \| 'Webhook'` | Optional delivery mode; the host defaults to `Webhook`. |
| `connection` | `string` | Connector connection setting; required for `Poll`. |
| `triggerConfigName` | `string` | Trigger configuration name or app setting expression; required for `Poll`. |
| `cardinality` | `'one' \| 'many'` | Use `many` for batching; defaults to `one`. |
| `maxBatchSize` | `number` | Optional per-function batch size; otherwise the host default applies. |
| `maxConcurrentCalls` | `number` | Optional concurrency for single-event invocations; the extension processes batches one at a time. |
| `targetPendingEventThreshold` | `number` | Target pending event count per function instance for scaling. |
| `extraInputs` | `FunctionInput[]` | Optional extra input bindings. |
| `extraOutputs` | `FunctionOutput[]` | Optional extra output bindings. |
| `return` | `FunctionOutput` | Optional return output binding. |

### Exported types

Context and item types in the tables are exported from this package. The
package also exports `ConnectorTriggerContext`, `ConnectorTriggerHandler`,
`ConnectorTriggerOptions`, `ConnectorTriggerRegistration`,
`TriggerCallbackPayload`, and `TriggerCallbackBody`, along with the supported
SDK `*TriggerPayload` aliases. The full public declarations are in
[types/index.d.ts](types/index.d.ts).

## Troubleshooting

- **A preview version cannot be installed:** confirm your npm registry contains
  the requested extension and SDK versions. Until publication, use compatible
  locally built packages or a registry containing both previews.
- **Polling options do not type-check:** ensure your app uses this release of
  the extension and a compatible `@azure/functions` version. Use the exact
  strings `'Poll'`, `'Webhook'`, `'one'`, and `'many'`.
- **Poll registration fails:** configure both `connection` and
  `triggerConfigName`, check the host's connection/identity configuration, and
  confirm the remote trigger and host extension support polling.
- **The function starts but receives no events:** confirm the connector
  connection is authorized and the correct remote trigger configuration is
  enabled. For webhooks, verify the function name, accessible HTTPS callback,
  and system-key authentication. For polling, verify the poll configuration,
  connection setting, and trigger name. Starting the host does not create them.
- **`items` is empty:** inspect the incoming envelope shape without logging
  sensitive data. Missing, empty, or unsupported bodies contribute no items.
  Malformed JSON logs `Failed to parse connector trigger payload`; the wrapper
  invokes the handler with an empty context.
- **A type appears incorrect at runtime:** TypeScript types do not validate or
  transform payloads. Check the connector operation, wire field names, and
  `rawPayload`, then validate and narrow dynamic fields.

Configure host log levels in `host.json`; the included
[sample configuration](samples/connectorTriggerSample/host.json) shows the
connector extension category. Avoid logging raw payloads, callback keys, or
customer data.

## Next steps

- Follow the [sample guide](samples/README.md) for the included Node.js app
  and links to additional connector examples.
- See the [connector extension](https://github.com/Azure/azure-functions-connector-extension)
  for host configuration and webhook authentication.
- See [Azure Connectors Node.js SDK](https://github.com/Azure/Connectors-NodeJS-SDK)
  for operation metadata, required connector parameters, and client APIs.
- Follow the repository's [contribution guide](../CONTRIBUTING.md).

## Keeping the documentation current

When adding or changing a helper, SDK operation, public type, example, or
dependency version, update this README and the sample guide as applicable.
`npm test` checks the connector inventory and SDK operation IDs against the
code, checks relative links and declared versions, and type-checks the
TypeScript examples against the published declarations. See
[test/documentation.test.ts](test/documentation.test.ts).

Run the development checks from this package directory:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

These local checks use synthetic payloads and do not prove live connector
authorization, trigger creation, polling, or webhook delivery.

## License

[MIT](LICENSE)
