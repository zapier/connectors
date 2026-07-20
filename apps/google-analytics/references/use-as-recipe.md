# GA4 as a recipe: writing your own code against the API

## When to use

Use this when a harness is writing its OWN code against the GA4 API over its own authed HTTPS transport (e.g. an `execute_snippet` sandbox that can't load the tools, run a CLI, or import the package).

If you can instead call the tools directly, run them from a terminal, or import the package, see the connector's `SKILL.md` (Setup / Running scripts) for those invocation shapes.

## Auth

All requests below use "your authed request" — supply auth via your own transport:

- Admin API (`https://analyticsadmin.googleapis.com`) and Data API (`https://analyticsdata.googleapis.com`): OAuth Bearer token. Scope requirements per [google-analytics-api-gotchas.md §1](./google-analytics-api-gotchas.md#1-authentication--scopes) (reads accept `analytics.readonly` or the full `analytics` scope; writes need `analytics.edit`).
- `sendEvent` (Measurement Protocol): no OAuth. Auth is the `api_secret` query parameter — see the sendEvent recipe below.

Property ids are the bare numeric id; the resource name is `properties/{propertyId}` — see [§3](./google-analytics-api-gotchas.md#3-property-ids--resource-names).

## Per-tool recipes

Field names/types and input enum values below are mechanism. Response shapes show only the id/handle fields a follow-up needs.

### runReport

`POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport`

Body (all optional unless noted):

```json
{
  "dimensions": [{ "name": "eventName" }],
  "metrics": [{ "name": "eventCount" }],
  "dateRanges": [{ "startDate": "7daysAgo", "endDate": "today" }],
  "dimensionFilter": {
    "filter": { "fieldName": "...", "stringFilter": { "value": "..." } }
  },
  "metricFilter": {
    "filter": {
      "fieldName": "...",
      "numericFilter": {
        "operation": "GREATER_THAN",
        "value": { "int64Value": "0" }
      }
    }
  },
  "metricAggregations": ["TOTAL"],
  "orderBys": [{ "metric": { "metricName": "eventCount" }, "desc": true }],
  "limit": "10000",
  "offset": "0",
  "currencyCode": "USD",
  "keepEmptyRows": false,
  "returnPropertyQuota": true
}
```

Response (fields you page/parse on):

```json
{
  "dimensionHeaders": [{ "name": "..." }],
  "metricHeaders": [{ "name": "...", "type": "TYPE_INTEGER" }],
  "rows": [
    {
      "dimensionValues": [{ "value": "..." }],
      "metricValues": [{ "value": "..." }]
    }
  ],
  "rowCount": 0,
  "metadata": { "dataLossFromOtherRow": false, "subjectToThresholding": false },
  "propertyQuota": { "tokensPerDay": { "consumed": 0, "remaining": 0 } }
}
```

Page by advancing `offset` until you have read `rowCount` rows; cast each `metricValues[].value` per its `metricHeaders[].type`. See [§4](./google-analytics-api-gotchas.md#4-reporting-runreport).

### getMetadata

`GET https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}/metadata` (use `properties/0` for universal metadata, no custom fields).

Response:

```json
{
  "dimensions": [
    {
      "apiName": "eventName",
      "uiName": "Event name",
      "customDefinition": false
    }
  ],
  "metrics": [
    {
      "apiName": "eventCount",
      "uiName": "Event count",
      "customDefinition": false
    }
  ]
}
```

### checkCompatibility

`POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:checkCompatibility`

```json
{
  "dimensions": [{ "name": "..." }],
  "metrics": [{ "name": "..." }],
  "compatibilityFilter": "COMPATIBLE"
}
```

Response:

```json
{
  "dimensionCompatibilities": [
    { "dimensionMetadata": { "apiName": "..." }, "compatibility": "COMPATIBLE" }
  ],
  "metricCompatibilities": [
    { "metricMetadata": { "apiName": "..." }, "compatibility": "INCOMPATIBLE" }
  ]
}
```

Drop `INCOMPATIBLE` fields and retry the report. See [§7](./google-analytics-api-gotchas.md#7-checkcompatibility).

### runRealtimeReport

`POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runRealtimeReport`

```json
{
  "dimensions": [{ "name": "country" }],
  "metrics": [{ "name": "activeUsers" }],
  "minuteRanges": [{ "startMinutesAgo": 29, "endMinutesAgo": 0 }],
  "limit": "10000"
}
```

No `dateRanges`; realtime accepts a smaller, different field set. Response shape mirrors `runReport` (`dimensionHeaders`/`metricHeaders`/`rows`/`rowCount`). See [§6](./google-analytics-api-gotchas.md#6-realtime-runrealtimereport).

### listAccountSummaries

`GET https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=50&pageToken=...`

Response:

```json
{
  "accountSummaries": [
    {
      "account": "accounts/{id}",
      "propertySummaries": [
        { "property": "properties/{propertyId}", "displayName": "..." }
      ]
    }
  ],
  "nextPageToken": "..."
}
```

### createCustomDimension

`POST https://analyticsadmin.googleapis.com/v1beta/properties/{propertyId}/customDimensions`

```json
{
  "parameterName": "my_param",
  "displayName": "...",
  "scope": "EVENT",
  "disallowAdsPersonalization": false
}
```

`scope` ∈ `EVENT`/`USER`/`ITEM`. Response returns the resource `name` (`properties/{p}/customDimensions/{id}`) — capture the trailing `{id}` to archive later.

### archiveCustomDimension

`POST https://analyticsadmin.googleapis.com/v1beta/properties/{propertyId}/customDimensions/{id}:archive`

Empty request body; success returns `{}`. Archive is the only removal — see [§8 archive-only](./google-analytics-api-gotchas.md#custom-dimensions).

### createCustomMetric

`POST https://analyticsadmin.googleapis.com/v1beta/properties/{propertyId}/customMetrics`

```json
{
  "parameterName": "my_metric",
  "displayName": "...",
  "scope": "EVENT",
  "measurementUnit": "STANDARD",
  "restrictedMetricType": ["REVENUE_DATA"]
}
```

`measurementUnit` ∈ `STANDARD`/`CURRENCY`/`FEET`/`METERS`/`KILOMETERS`/`MILES`/`MILLISECONDS`/`SECONDS`/`MINUTES`/`HOURS`. `CURRENCY` requires `restrictedMetricType` (`COST_DATA`/`REVENUE_DATA`) — see [§8 custom metrics](./google-analytics-api-gotchas.md#custom-metrics). Response returns `name` (`.../customMetrics/{id}`).

### archiveCustomMetric

`POST https://analyticsadmin.googleapis.com/v1beta/properties/{propertyId}/customMetrics/{id}:archive`

Empty body; returns `{}`. Archive-only, no delete.

### createKeyEvent

`POST https://analyticsadmin.googleapis.com/v1beta/properties/{propertyId}/keyEvents`

```json
{
  "eventName": "purchase",
  "countingMethod": "ONCE_PER_EVENT"
}
```

`countingMethod` ∈ `ONCE_PER_EVENT`/`ONCE_PER_SESSION`. `eventName` must be an event the property already collects. Response returns `name` (`.../keyEvents/{id}`) and a `deletable` flag. Key events support delete via `DELETE .../keyEvents/{id}` (unlike custom dims/metrics) — see [§8 key events](./google-analytics-api-gotchas.md#key-events-replaced-conversionevents).

### listDataStreams

`GET https://analyticsadmin.googleapis.com/v1beta/properties/{propertyId}/dataStreams?pageSize=50&pageToken=...`

Response:

```json
{
  "dataStreams": [
    {
      "name": "properties/{p}/dataStreams/{streamId}",
      "type": "WEB_DATA_STREAM",
      "webStreamData": { "measurementId": "G-XXXX" }
    }
  ],
  "nextPageToken": "..."
}
```

`type` ∈ `WEB_DATA_STREAM`/`ANDROID_APP_DATA_STREAM`/`IOS_APP_DATA_STREAM`. The `measurementId` here (web streams) is the `G-XXXX` used by sendEvent — not the property id.

### sendEvent (Measurement Protocol)

`POST https://www.google-analytics.com/mp/collect?api_secret={secretValue}&measurement_id={G-XXXX}`
(app variant: `?api_secret=...&firebase_app_id=...`)

```json
{
  "client_id": "...",
  "events": [{ "name": "my_event", "params": { "key": "value" } }]
}
```

Web needs `client_id`; app needs `app_instance_id`. This returns no error even for invalid events — validate against `https://www.google-analytics.com/debug/mp/collect`, which returns `validationMessages[]`. See [§9](./google-analytics-api-gotchas.md#9-measurement-protocol-sendevent).

## Error handling

OAuth (Admin/Data API) errors use this envelope:

```json
{ "error": { "code": 403, "message": "...", "status": "PERMISSION_DENIED" } }
```

`code` is the HTTP status; `status` is the canonical string that keys recovery. For what each status means and how to recover, see [google-analytics-api-gotchas.md §2](./google-analytics-api-gotchas.md#2-error-envelope--recovery). (sendEvent does not use this envelope — see the no-validation rule below.)

## Critical rules (pointers — one home per claim)

- **Archive, not delete**, for custom dimensions/metrics; key events use delete → [§8](./google-analytics-api-gotchas.md#custom-dimensions).
- **Quota exhaustion** on any one quota returns `RESOURCE_EXHAUSTED` for ALL requests to that property; back off and read `returnPropertyQuota` → [§2](./google-analytics-api-gotchas.md#2-error-envelope--recovery), [§5](./google-analytics-api-gotchas.md#5-quotas-data-api).
- **Incompatible dimensions/metrics** → run `checkCompatibility` and drop `INCOMPATIBLE` fields → [§7](./google-analytics-api-gotchas.md#7-checkcompatibility).
- **sendEvent gives no validation** — a 2xx is not confirmation; validate via `/debug/mp/collect` → [§9](./google-analytics-api-gotchas.md#9-measurement-protocol-sendevent).
- **Property-id format** is the bare numeric id / `properties/{propertyId}`; `G-XXXX` is a web stream measurement id → [§3](./google-analytics-api-gotchas.md#3-property-ids--resource-names).
