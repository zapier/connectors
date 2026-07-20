# Google Analytics (GA4) API gotchas

Non-obvious vendor behavior for agents working the GA4 Admin API (`analyticsadmin.googleapis.com`), Data API (`analyticsdata.googleapis.com`), and Measurement Protocol (`www.google-analytics.com`). Every vendor claim below is cited to its public source.

## 1. Authentication & scopes

The Admin API and Data API use OAuth. Read operations accept **either** scope; all writes require the edit scope. sendEvent is the exception — it authenticates with a data-stream API secret, not OAuth (see §9).

- Read scopes: `https://www.googleapis.com/auth/analytics.readonly` ("See and download your Google Analytics data") OR `https://www.googleapis.com/auth/analytics`. Data API report/metadata methods state: "Requires one of the following OAuth scopes: `.../analytics.readonly` or `.../analytics`" ([OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes), [Data API runReport](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport)).
- Write scope: `https://www.googleapis.com/auth/analytics.edit` ("Edit Google Analytics management entities"). Every mutation — create / patch / archive / delete, and creating a Measurement Protocol secret — requires `analytics.edit` ([OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes), [Admin API customDimensions.create](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.customDimensions/create)).

## 2. Error envelope & recovery

Errors come back as `{ "error": { "code": <HTTP int>, "message": <string>, "status": <STRING> } }` (a `details[]` array may also appear). `code` is the HTTP status code, "not the direct value of `google.rpc.Status.code`"; `status` is the canonical enum string ([AIP-193 Errors](https://google.aip.dev/193), [API Design — Errors](https://cloud.google.com/apis/design/errors)).

The `status` → HTTP mapping is defined by Google's canonical `google.rpc.Code` enum, which AIP-193 designates as authoritative (tier: official Google source) ([google/rpc/code.proto](https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto), [AIP-193 Errors](https://google.aip.dev/193)).

| status               | HTTP | meaning                                                                                                                | recovery                                                                                                                                                        |
| -------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UNAUTHENTICATED`    | 401  | "The request does not have valid authentication credentials" — caller cannot be identified (token expired/invalid)     | Refresh/reconnect credentials                                                                                                                                   |
| `PERMISSION_DENIED`  | 403  | "The caller does not have permission to execute the specified operation" — no access to the property, or missing scope | Grant the account access to the property in GA4 Admin, or reconnect with `analytics.edit` for writes; do not retry unchanged                                    |
| `RESOURCE_EXHAUSTED` | 429  | "Some resource has been exhausted, perhaps a per-user quota"                                                           | Back off; read remaining balance with `returnPropertyQuota` (§5). Note: once any quota for a property is exhausted, ALL requests to that property fail this way |
| `INVALID_ARGUMENT`   | 400  | "The client specified an invalid argument" — includes incompatible dimensions/metrics                                  | Fix the argument; for incompatible fields run `checkCompatibility` (§7)                                                                                         |

`UNAUTHENTICATED` is used when the caller cannot be identified, as opposed to `PERMISSION_DENIED` ([AIP-193 Errors](https://google.aip.dev/193), [google/rpc/code.proto](https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto)). `PERMISSION_DENIED` maps to HTTP 403 when "the user does not have permission to access the resource or parent" ([AIP-193 Errors](https://google.aip.dev/193)).

## 3. Property ids & resource names

Properties are addressed as `properties/{property_id}` — for example `properties/1000` ([Admin API getProperty](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties/get)). The trailing digits are the numeric property id; tools take that bare numeric id and the connector forms the resource name.

Do NOT confuse the property id with a measurement id. `G-XXXX` (e.g. `G-1A2BCD345E`) is a **web data stream's** `measurementId`, not the property id ([Admin API dataStreams](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.dataStreams/list)).

## 4. Reporting (runReport)

`POST /v1beta/properties/{propertyId}:runReport`.

**Discovering fields.** Valid dimension/metric names come from `getMetadata`, which "Returns metadata for dimensions and metrics available in reporting methods" and "includes Custom dimensions and metrics as well as Universal metadata." Each field exposes an `apiName` (used in requests, e.g. `eventName`) vs a `uiName` (the label in the GA UI, e.g. `Event name`), and a `customDefinition` flag ("True if the dimension is custom to this property"). Setting the property id to `0` returns metadata common to all properties and, in that mode, "will not return custom dimensions and metrics" ([Data API getMetadata](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/getMetadata)).

**Date ranges.** The connector's relative grammar (`today`/`yesterday`/`NdaysAgo`, `YYYY-MM-DD`) is a convenience layer. The API's own facts: you supply one or more date ranges, and "If multiple date ranges are requested, each response row will contain a zero based date range index" ([Data API runReport](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport)). The report day boundary is the property's reporting time zone: "Reporting Time Zone, used as the day boundary for reports, regardless of where the data originates" ([Admin API getProperty](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties/get)).

**Filters.** `dimensionFilter` selects dimension values before aggregation ("Metrics cannot be used in this filter") — like SQL `WHERE`. `metricFilter` is "Applied after aggregating the report's rows, similar to SQL having-clause. Dimensions cannot be used in this filter" — like `HAVING` ([Data API runReport](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport)). Both take a `FilterExpression`, a union where "expr … can be only one of the following": `andGroup` (AND), `orGroup` (OR), `notExpression` (NOT), or a primitive `filter`. A `filter` has a `fieldName` plus exactly one of `stringFilter`/`inListFilter`/`numericFilter`/`betweenFilter`/`emptyFilter`, and "all of the filter's field names need to be either all dimensions or all metrics" ([FilterExpression](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/FilterExpression)).

**Paging.** "If unspecified, 10,000 rows are returned. The API returns a maximum of 250,000 rows per request." `offset` is "The row count of the start row. The first row is counted as row 0." Page by advancing `offset` until you have read `rowCount` rows; `rowCount` is the total independent of your `limit`/`offset` ([Data API runReport](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport)).

**Aggregations.** With `metricAggregations` (input enums `TOTAL`/`MINIMUM`/`MAXIMUM`/`COUNT`), "Aggregated metric values will be shown in rows where the dimensionValues are set to `RESERVED_(MetricAggregation)`" — filter these reserved rows out of ordinary row processing ([Data API runReport](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport)).

**Currency.** `currencyCode` is "A currency code in ISO4217 format, such as 'AED', 'USD', 'JPY'. If the field is empty, the report uses the property's default currency" ([Data API runReport](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport)).

**Empty rows.** `keepEmptyRows`: "If false or unspecified, each row with all metrics equal to 0 will not be returned" ([Data API runReport](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport)).

**Typed metric values.** Cast each metric per its `MetricHeader.type`: `TYPE_INTEGER` ("Integer type"), `TYPE_FLOAT` ("Floating point type"), `TYPE_CURRENCY` ("An amount of money; a special floating point type"), `TYPE_SECONDS` ("A duration of seconds; a special floating point type") ([MetricType](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/MetricType), [MetricHeader](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/RunReportResponse#MetricHeader)). The connector returns each metric value as the string GA4 sends; the caller casts it per the matching `metricHeaders[].type`.

**Data-quality flags on the response metadata.** `dataLossFromOtherRow`: "If true, indicates some buckets of dimension combinations are rolled into '(other)' row. This can happen for high cardinality reports." `subjectToThresholding`: "this report is subject to thresholding and only returns data that meets the minimum aggregation thresholds" (privacy minimums) ([ResponseMetaData](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/RunReportResponse#ResponseMetaData)).

## 5. Quotas (Data API)

"The Data API has three request quota categories: Core, Realtime, and Funnel." "Tokens are consumed with each request … The number of tokens charged depends on the request's complexity" ([Data API quotas](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas)). Per-property limits (Standard / 360) ([PropertyQuota](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/PropertyQuota)):

- Tokens per day: 200,000 / 2,000,000.
- Tokens per hour: 40,000 / 400,000.
- Per project per hour: a separate per-project hourly token cap (`tokensPerProjectPerHour` in `PropertyQuota`); read the live balance with `returnPropertyQuota`.
- Concurrent requests: 10 / 50.

Set `returnPropertyQuota` to read the current remaining balance, returned in `PropertyQuota` ([Data API runReport](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport)). Key gotcha: "If any quota for a property is exhausted, all requests to that property will return Resource Exhausted errors" — a single expensive query can lock out the whole property ([PropertyQuota](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/PropertyQuota)).

## 6. Realtime (runRealtimeReport)

`POST /v1beta/properties/{propertyId}:runRealtimeReport`. "Realtime reports show events and usage data for the periods of time ranging from the present moment to 30 minutes ago (up to 60 minutes for Google Analytics 360 properties)." With `minuteRanges`, standard properties can request `startMinutesAgo <= 29` and 360 properties `startMinutesAgo <= 59` ([Data API runRealtimeReport](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runRealtimeReport)). There are no date ranges.

Realtime accepts a **different, smaller** set of fields than the Core Reporting methods: "The Core Reporting methods (RunReport for example) accept a different set of Dimensions & Metrics than the Realtime method" ([Realtime API schema](https://developers.google.com/analytics/devguides/reporting/data/v1/realtime-api-schema)). The realtime set:

- Dimensions: `country`, `city`, `deviceCategory`, `eventName`, `minutesAgo`, `platform`, `streamId`, `unifiedScreenName`, `audienceId`, `audienceName`, `appVersion`, plus user-scoped custom dimensions (`customUser:*`).
- Metrics: `activeUsers`, `eventCount`, `keyEvents`, `screenPageViews`.
- Event-scoped custom dimensions and custom metrics are NOT supported in realtime ([Realtime API schema](https://developers.google.com/analytics/devguides/reporting/data/v1/realtime-api-schema)).

## 7. checkCompatibility

`POST /v1beta/properties/{propertyId}:checkCompatibility`. "Reports fail in Google Analytics if they request incompatible dimensions and/or metrics." This method "lists dimensions and metrics that can be added to a report request and maintain compatibility." The response returns `dimensionCompatibilities[]` and `metricCompatibilities[]`, each field marked `COMPATIBLE` ("can be successfully added to a report") or `INCOMPATIBLE` ("cannot be successfully added to a report") — drop the incompatible ones and retry. Set `compatibilityFilter` to `COMPATIBLE` "to only return compatible dimensions & metrics" ([Data API checkCompatibility](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/checkCompatibility)).

## 8. Admin config

### Custom dimensions

- Scope enum: `EVENT` ("scoped to an event"), `USER` ("scoped to a user"), `ITEM` ("scoped to eCommerce items").
- `parameterName`: "May only contain alphanumeric and underscore characters, starting with a letter. Max length of 24 characters for user-scoped dimensions, 40 characters for event-scoped dimensions."
- `disallowAdsPersonalization` (NPA) "is currently only supported by user-scoped custom dimensions" ([Admin API customDimensions](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.customDimensions)).
- **Archive-only — there is no delete method.** "Archives a CustomDimension on a property." "If successful, the response body is an empty JSON object." Archive is the only way to remove one ([Admin API customDimensions.archive](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.customDimensions/archive)).
- Per-property limits (Standard tier): event-scoped 50, user-scoped 25, item-scoped 10. "If you hit the limit for custom dimensions, you'll need to wait 48 hours after deleting dimensions to add new ones" ([Custom dimensions limits](https://support.google.com/analytics/answer/10075209)).

### Custom metrics

- Scope `EVENT` only ("Metric scoped to an event"). `parameterName` "May only contain alphanumeric and underscore charactes, starting with a letter. Max length of 40 characters for event-scoped metrics."
- `measurementUnit` enum: `STANDARD`, `CURRENCY`, `FEET`, `METERS`, `KILOMETERS`, `MILES`, `MILLISECONDS`, `SECONDS`, `MINUTES`, `HOURS`.
- **`CURRENCY` requires `restrictedMetricType`** ("Required for metrics with CURRENCY measurement unit"), values `COST_DATA` / `REVENUE_DATA` ([Admin API customMetrics](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.customMetrics)).
- **Archive-only, no delete.** "Archives a CustomMetric on a property" ([Admin API customMetrics.archive](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.customMetrics/archive)).
- Per-property limit (Standard / 360): 50 / 125 ([Custom metrics limits](https://support.google.com/analytics/answer/10075209)).

### Key events (replaced conversionEvents)

- Key events are "events that measure actions that are important to the success of your business" — formerly called conversions. The Admin API's `ConversionEvent` resource is deprecated: "Use the KeyEvent resource and methods instead" ([Key events rename](https://support.google.com/analytics/answer/13965727), [Key events definition](https://support.google.com/analytics/answer/9267568)).
- `countingMethod`: `ONCE_PER_EVENT` ("Each Event instance is considered a Key Event") or `ONCE_PER_SESSION` ("An Event instance is considered a Key Event at most once per session per user").
- `custom` flag distinguishes a custom event from a default GA event; `deletable` "If set to true, this event can be deleted." `eventName` is immutable; any valid GA4 event name is accepted — the event does not need to have been collected yet (verified in smoke testing).
- **Key events DO support delete** ("Deletes a Key Event", `DELETE .../keyEvents/*`) — contrast with archive-only custom dimensions/metrics ([Admin API keyEvents.delete](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.keyEvents/delete)).
- Limit: "up to 30 events as key events for standard properties and 50 events as key events for Analytics 360 properties" ([Key events limit](https://support.google.com/analytics/answer/13128484)).

### Data streams

- Types: `WEB_DATA_STREAM`, `ANDROID_APP_DATA_STREAM`, `IOS_APP_DATA_STREAM`. A web stream carries `measurementId` (`G-XXXX`, e.g. `G-1A2BCD345E`); app streams carry `firebaseAppId` ([Admin API dataStreams](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.dataStreams/list)).

### Pagination

- List methods default `pageSize` 50, max 200, with `pageToken` → `nextPageToken` ([Admin API accountSummaries.list](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accountSummaries/list)).
- **Exception:** `measurementProtocolSecrets.list` defaults to 10 and maxes at 10 — "Higher values will be coerced to the maximum" ([Admin API measurementProtocolSecrets.list](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.dataStreams.measurementProtocolSecrets/list)).

## 9. Measurement Protocol (sendEvent)

> **Connector scope:** `createMeasurementProtocolSecret` and `listMeasurementProtocolSecrets` are available in this connector; there is no `deleteMeasurementProtocolSecret` tool. Deletion is intentionally out of scope — rotate or delete secrets in the GA4 Admin UI (Admin → Data streams → (select stream) → Measurement Protocol API secrets).

`POST https://www.google-analytics.com/mp/collect`. Authenticated by the `api_secret` query param — the `secretValue` of a `MeasurementProtocolSecret` ("Pass this value to the api_secret field … when sending hits to this secret's parent property") — plus **exactly one** of `measurement_id` (web; also needs `client_id`, "Unique identifier for a browser client instance") or `firebase_app_id` (app; needs `app_instance_id`) ([MP reference](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference), [MP sending events](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events), [Admin API measurementProtocolSecrets](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.dataStreams.measurementProtocolSecrets)).

- At most 25 events per request ("Requests can have a maximum of 25 events") ([MP reference](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference)).
- Event name rules: "Event names must start with a letter. Use only letters, numbers, and underscores. Don't use spaces." They are case-sensitive (`my_event` and `My_Event` are distinct), and at most 40 characters ([Event name rules](https://support.google.com/analytics/answer/13316687), [Event name length](https://support.google.com/analytics/answer/9267744)). Reserved prefixes (an event name must not start with these): `_`, `firebase_`, `ga_`, `google_`, `gtag.` ([MP reference](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference)).
- Up to 25 params per event; param names at most 40 characters ([MP reference](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference)).
- Backdating: "Events and user properties can be backdated up to 72 hours" via `timestamp_micros` (a Unix timestamp in microseconds, not milliseconds) ([MP sending events](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events)).

**THE KEY GOTCHA — success is not confirmation.** "The Google Analytics Measurement Protocol does not return HTTP error codes, even if an event is malformed or missing required parameters." A 2xx from `/mp/collect` tells you nothing about validity. Validate against `https://www.google-analytics.com/debug/mp/collect` (the validation URL "includes '/debug' unlike the standard Measurement Protocol URL"), which returns `validationMessages[]` (`fieldPath`, `description`, `validationCode`; empty means OK). Caveats: "The validation server does not validate the api_secret or firebase_app_id", and "Events sent to the validation server don't show up in reports" ([MP validating events](https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events)).
