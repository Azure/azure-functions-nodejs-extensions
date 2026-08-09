# Changelog

All notable changes to `@azure/functions-extensions-connectors` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2-preview] - 2026-05-22

### Added

- First-class trigger registrations for two new connectors aligned with `@azure/connectors` `v0.2.0-preview`:
  - `connectors.azureblob.onUpdatedFile()` — Azure Blob updated-file triggers with `AzureBlobFileTriggerContext` (`files`).
  - `connectors.onedrive.onNewFile()` and `connectors.onedrive.onUpdatedFile()` — OneDrive for Business triggers with `OneDriveFileTriggerContext` (`files`).
- Additional first-class trigger registrations for existing connectors:
  - `connectors.office365.onFlaggedEmail()` — flagged email triggers (`emails`).
  - `connectors.office365.onNewMentionMeEmail()` — @mention email triggers (`emails`).
  - `connectors.office365.onUpcomingEvent()` — upcoming calendar event triggers (`calendarEvents`).
  - `connectors.teams.onNewChannelMessageMentioningMe()` — Teams @mention channel message triggers (`messages`).
  - `connectors.teams.onGroupMembershipAdd()` and `connectors.teams.onGroupMembershipRemoval()` — Teams group membership triggers with `GroupMembershipTriggerContext` (`members`).
- New context interfaces: `AzureBlobFileTriggerContext`, `OneDriveFileTriggerContext`, `GroupMembershipTriggerContext`.
- New connector trigger interface groupings: `AzureBlobTriggers`, `OneDriveTriggers`. Extended `Office365Triggers` and `TeamsTriggers` with the new methods.
- Re-exports of new connector SDK item types: `AzureBlobMetadata`, `OneDriveBlobMetadata`.
- 13 new sample functions under `samples/connectorTriggerSample/src/functions/` covering every new first-class trigger: `onAzureBlobUpdatedFile`, `onOneDriveNewFile`, `onOneDriveUpdatedFile`, `onFlaggedEmail`, `onNewMentionMeEmail`, `onNewCalendarEvent`, `onUpcomingEvent`, `onNewChannelMessage`, `onNewChannelMessageMentioningMe`, `onGroupMembershipAdd`, `onGroupMembershipRemoval`, `onKustoQueryResult`, `onSharepointNewFile`.

### Changed

- Aggregated `connectors` namespace now exposes six connector groupings: `azureblob`, `kusto`, `office365`, `onedrive`, `sharepoint`, `teams`.
- Bumped `@azure/connectors` runtime dependency to `^0.2.0-preview` to pick up the new generated extension surface (`Azureblob`, `Onedriveforbusiness`, and additional `Office365` / `Teams` trigger methods).

### Notes

- The following SDK connectors are intentionally not exposed as first-class triggers because they are action-only and have no trigger endpoints: `arm`, `azuremonitorlogs`, `mq`, `msgraphgroupsanduser`, `office365users`, `smtp`. Consume them by instantiating their clients directly from `@azure/connectors`.

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
