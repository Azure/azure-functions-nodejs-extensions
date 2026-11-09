# Node.js connector trigger samples

The examples below demonstrate registering Azure Functions connector handlers.
They do not provision a Connector Namespace, authorize a connection, or create
remote triggers. See the [package guide](../README.md) for the complete
connector inventory, supported payload shapes, polling options, and limits.

## Included sample app

[`connectorTriggerSample`](connectorTriggerSample/) contains:

| Function | Example | Input |
|---|---|---|
| `OnNewEmail` | [Named Office 365 helper](connectorTriggerSample/src/functions/onNewEmail.ts) | Normalized context with `emails`, `items`, `payload`, and `rawPayload`. |
| `OnNewEmailDirect` | [Direct Functions API](connectorTriggerSample/src/functions/onNewEmailDirect.ts) | Raw host input from `app.connectorTrigger()`. |

The named helper and direct API illustrate different contracts. The direct API
does not provide this package's typed context, named aliases, or envelope
normalization.

### Prerequisites

- Node.js 24+, npm, Azure Functions Core Tools v4, and host storage. Start
  Azurite when using `UseDevelopmentStorage=true`.
- Compatible published preview dependencies, a configured registry containing
  them, or locally built SDK and extension packages. The preview versions and
  their publication status are described in the [installation guide](../README.md#install-the-package).
- A live connector connection and corresponding remote trigger configuration
  for end-to-end testing. An account with the appropriate Office 365 permissions
  is required for the email sample.

The sample's [host.json](connectorTriggerSample/host.json) selects the
experimental extension bundle. Use a host and bundle that support the desired
connector delivery mode.

### Run locally

From `samples/connectorTriggerSample`, configure `local.settings.json` for
your Functions host and host storage, then run:

```sh
npm install
npm start
```

Do not commit secrets or system keys in `local.settings.json`. The included
functions default to webhook delivery. For the named helper, follow the
[polling example](../README.md#polling-with-batched-office-365-messages) to
configure polling against a compatible remote trigger and host connection.

Starting the host does not create or authorize the remote trigger. For webhook
delivery, the callback must be reachable over HTTPS and target the intended
function with the required connector system-key authentication. Poll delivery
uses the configured polling trigger instead of a consumer webhook callback.
Check the Functions host logs using test data and avoid logging sensitive
message content.

## More connector examples

The [TypeScript connector samples](https://github.com/Azure-Samples/functions-connectors-typescript)
include Office 365, SharePoint, OneDrive for Business, Teams, Planner,
Salesforce, Azure DevOps, Dataflows, Kusto, Azure Blob, and generic examples.
Each app documents its own setup, supported operation IDs, and permissions.
Check its package versions: examples pinned to an earlier extension release do
not automatically demonstrate this release's polling options.

Kusto's typed callback helper does not itself run a query or create a trigger.
The generic examples require a verified payload type and supported envelope
shape. Offline sample tests do not establish live connector delivery.
