# Changelog

All notable changes to `@azure/functions-extensions-connectors` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
