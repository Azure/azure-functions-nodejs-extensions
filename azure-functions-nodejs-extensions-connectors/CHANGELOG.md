# Changelog

All notable changes to `@azure/functions-extensions-connectors` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Typed registrations for all 38 callback payload aliases exposed by SDK
  `@azure/connectors` 0.3.1-preview across Office 365, SharePoint Online,
  OneDrive for Business, Teams, Planner, Salesforce and Azure DevOps (VSTS).
- Dataflows refresh registration and a normalized callback payload alias based
  on the SDK `RefreshModel`.
- Public SDK payload re-exports, collision-safe item aliases, and named context
  properties for each new trigger family.
- Runtime coverage for all typed registrations and compile-time SDK payload
  compatibility and handler inference checks.
- Connector-specific payload fidelity tests, malformed and missing payload
  coverage, registration and invocation isolation checks, and negative type
  tests for all eight connector families.

### Fixed

- Preserve the shared `items` array in the malformed-payload fallback so
  `payload.body.value` and connector-specific aliases remain reference-equal.

### Changed

- Update the connector SDK dependency from `^0.1.1-preview` to `^0.3.1-preview`.
- Update the Functions peer, development and sample dependencies to `^4.17.0`,
  allowing compatible updates instead of pinning a preview release.
- Install the latest connector SDK in the README without an exact version pin.
- SharePoint file-property registrations use SDK dynamic `Item` records;
  existing file metadata helpers retain their original signatures and behavior.

## [0.0.1-preview] - 2025-05-14

### Added

- Initial preview release of the Azure Functions Connectors Extension.
- Generic `connectorTrigger()` registration helper with payload normalization (batch, single-item, and string formats).
- First-class connector trigger registrations via `connectors` namespace:
  - `connectors.kusto.onQueryResult()` — Kusto query result triggers with `QueryResultTriggerContext` (`rows`).
  - `connectors.office365.onNewEmail()` — Office 365 email triggers with `EmailTriggerContext` (`emails`).
  - `connectors.office365.onNewCalendarEvent()` — Office 365 calendar triggers with `CalendarEventTriggerContext` (`calendarEvents`).
  - `connectors.sharepoint.onNewFile()` — SharePoint new file triggers with `FileTriggerContext` (`files`).
  - `connectors.sharepoint.onUpdatedFile()` — SharePoint updated file triggers with `FileTriggerContext` (`files`).
  - `connectors.teams.onNewChannelMessage()` — Teams channel message triggers with `ChannelMessageTriggerContext` (`messages`).
- Strongly-typed `ConnectorTriggerContext<TItem>` with `payload`, `items`, `rawPayload`, and `toJSON()`.
- Connector-specific context interfaces with named item aliases (`emails`, `calendarEvents`, `files`, `messages`, `rows`).
- Re-exports of connector SDK item types (`GraphClientReceiveMessage`, `GraphCalendarEventClientReceive`, `BlobMetadata`, `ChatMessage`, `Row`).
- Warning log on malformed trigger payload parse failures.
