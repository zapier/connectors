# Google Ads API gotchas

Agent-facing notes for the behaviors of the Google Ads REST API that most often trip up
callers of this connector. Every claim below is drawn from the official Google Ads API
documentation; source links are inline. The connector targets **API v23**
(`https://googleads.googleapis.com/v23`).

## Auth & headers

- **OAuth scope.** The connection authorizes with the single Google Ads scope
  `https://www.googleapis.com/auth/adwords`. Per the docs, "The scope for the Google Ads API
  is: https://www.googleapis.com/auth/adwords"
  ([OAuth internals](https://developers.google.com/google-ads/api/docs/oauth/internals)).
- **`developer-token` header is required on every call.** "A developer token is required to
  make calls to the Google Ads API and is a 22-character alphanumeric string"; "Whenever you
  make an API call, you send the developer token as part of the request by setting the
  `developer-token` http or gRPC header"
  ([dev token](https://developers.google.com/google-ads/api/docs/get-started/dev-token)).
  The connection injects this header; you don't pass it as a tool input.
- **`login-customer-id` header — only for manager (MCC) access.** "If your access to the
  customer account is through a manager account, this header is _required_ and must be set to
  the customer ID of the manager account." It is "the customer ID of the authorized customer
  to use in the request, without hyphens (`-`)"
  ([call structure](https://developers.google.com/google-ads/api/docs/concepts/call-structure)).
  In this connector that maps to the `loginCustomerId` tool input — set it to the manager
  account id when the operating account is reached through a manager; omit it for direct access.
- **Omitting it under manager access fails with a permission error.** The fix Google gives for
  `AuthorizationError.USER_PERMISSION_DENIED` is: "Specify the `login-customer-id` as the
  manager account ID without hyphens (`-`)"
  ([common errors](https://developers.google.com/google-ads/api/docs/common-errors)).
- **Customer IDs are digits only.** IDs are sent "without hyphens (`-`)" (same call-structure
  page). Strip the dashes from the UI's `123-456-7890` form before passing `customerId` or
  `loginCustomerId`.

## Account hierarchy

- A **manager account (MCC)** sits above one or more **client / operating accounts**. The
  `login-customer-id` header is only needed when you reach an operating account through a manager
  ([call structure](https://developers.google.com/google-ads/api/docs/concepts/call-structure)).
- **Resolving accounts:** start with `listAccessibleCustomers`. It "[r]eturns the resource names
  of customers directly accessible by the user authenticating the call" — i.e. only the accounts
  directly accessible to the authenticated user, not those reachable through a manager
  relationship
  ([listing accounts](https://developers.google.com/google-ads/api/docs/account-management/listing-accounts)).
  If access is via a manager, follow with `listCustomerClients` (a `customer_client` query) to
  enumerate the operating accounts beneath it.

## GAQL (Google Ads Query Language)

The `search`, `getReport`, and the structured list tools all compile down to a GAQL query sent
to `customers/{customerId}/googleAds:search`.

- **SELECT and FROM are required.** "The `SELECT` and `FROM` clauses are required in a query
  when using `GoogleAdsService`"
  ([GAQL structure](https://developers.google.com/google-ads/api/docs/query/structure)).
- **One resource per FROM — no JOINs.** "Only a single resource can be specified in the `FROM`
  clause." You cannot select attributes from unrelated resources in one query; related data is
  reachable only through that resource's attributed resources (same page).
- **Response is field-masked.** The response carries only the fields you selected, and it
  includes a `fieldMask` listing the selected fields (e.g.
  `"fieldMask": "adGroupCriterion.keyword.text,adGroupCriterion.status"` in the reference's
  sample response)
  ([Search reference](https://developers.google.com/google-ads/api/rest/common/search)). The
  `resource_name` of the main resource is always returned even if unselected (GAQL structure).
- **Dates.** Use `segments.date DURING <PRESET>` for preset ranges
  (`"segments.date DURING LAST_30_DAYS"`, `"segments.date DURING LAST_7_DAYS"`; other presets:
  TODAY, YESTERDAY, LAST_14_DAYS, THIS_MONTH, LAST_MONTH, THIS_WEEK_SUN_TODAY,
  THIS_WEEK_MON_TODAY, LAST_WEEK_SUN_SAT, LAST_WEEK_MON_SUN), or
  `segments.date BETWEEN 'YYYY-MM-DD' AND 'YYYY-MM-DD'` for a custom range
  ([date ranges](https://developers.google.com/google-ads/api/docs/query/date-ranges)).
- **Discover valid fields with `GoogleAdsFieldService`.** "You can use `GoogleAdsFieldService`
  to dynamically request the catalog for resources, resource's fields, segmentation keys and
  metrics available in the `GoogleAdsService` _Search_ and _SearchStream_ methods", and "The
  catalog provides metadata that can be used by Google Ads API clients for validation and
  construction of Google Ads Query Language statements"
  ([field service](https://developers.google.com/google-ads/api/docs/concepts/field-service)).
  The `listSearchableFields` tool wraps this — it returns each field's `name`, its `category`,
  and whether the field is `selectable`, `filterable`, and `sortable` (along with related
  attribute metadata). Field-metadata queries have no `FROM` clause (they target the field
  catalog, not a resource). Call it before composing a `search` query when you're unsure a field
  exists.

## Micros (money fields)

Most monetary fields are expressed in **micros**, where **1,000,000 micros = 1 unit of the
account currency**.

- **Budget amount:** you "set an average daily budget with `amount_micros`"
  ([create budgets](https://developers.google.com/google-ads/api/docs/campaigns/budgets/create-budgets)).
  Amounts are in micros, where "$1.00 = 1,000,000 micros"
  ([account budgets](https://developers.google.com/google-ads/api/docs/billing/account-budgets)),
  so a $500 daily budget is 500,000,000 micros. `createCampaignBudget`/`updateCampaignBudget`
  take `amountMicros` as `dollars × 1,000,000`.
- **Bids and cost metrics** follow the same micros convention — `cpc_bid_micros` is a micros
  value (e.g. `cpc_bid_micros = 10_000_000` is 10 currency units) and metrics like `cost_micros`
  are micros. Divide any `*_micros` value by 1,000,000 to get the currency amount.
- **Exception — conversion action default value is plain currency, NOT micros.** A
  conversion action's `value_settings.default_value` is a plain numeric currency amount: the
  docs set `value_settings.default_value = 15.0` (i.e. 15 currency units, not micros)
  ([create conversion actions](https://developers.google.com/google-ads/api/docs/conversions/create-conversion-actions)).
  `createConversionAction`'s `valueDefault` is therefore a plain currency number, paired with a
  `valueCurrencyCode` (ISO 4217).

## Mutate semantics (create / update)

Writes go to `customers/{customerId}/{resource}:mutate` (e.g. `campaigns`, `campaignBudgets`,
`conversionActions`).

- **Operations envelope.** A mutate "uses a repeated `operations` field" — the request body is
  `{ "operations": [ ... ] }`, and each element is either a `create` or an `update`
  ([mutate best practices](https://developers.google.com/google-ads/api/docs/mutating/best-practices)).
  This connector sends one operation per call.
- **Update masks — omitted fields are NOT changed.** An update operation carries an
  `updateMask` (FieldMask). "The field mask lists all the fields you intend to change with the
  update", and "any specified fields that are not in the field mask will be ignored, even if
  sent to the server"
  ([update masks](https://developers.google.com/google-ads/api/docs/client-libs/python/field-masks)).
  `updateCampaignBudget` builds the mask from exactly the inputs you supply, so a field you
  don't pass stays untouched. `setCampaignStatus` masks only `status`.
- **Resource-name format.** Resources follow "`customers/{customer_id}/{resource}/{id}`"
  (mutate best practices). A successful mutate returns the affected resource's name in this form.

## Errors

- **Envelope.** On failure the response carries a `GoogleAdsFailure`: "`errors`: A list of
  `GoogleAdsError` objects, each detailing a specific error that occurred", where each
  `GoogleAdsError` has an `errorCode` (a granular, API-specific one-of code) and a
  human-readable `message`
  ([understand API errors](https://developers.google.com/google-ads/api/docs/best-practices/understand-api-errors)).
  This connector surfaces the first sub-error's code + message.
- **`AuthorizationError.USER_PERMISSION_DENIED`** — "The authorized customer does not have
  access to the operating customer." Fix: "Specify the `login-customer-id` as the manager
  account ID without hyphens (`-`)"
  ([common errors](https://developers.google.com/google-ads/api/docs/common-errors)). It is a
  client error — don't blind-retry; fix the request/credentials.
- **`QueryError.*`** — a problem with the GAQL query itself surfaces as a query-related error
  code. GAQL has required `SELECT`/`FROM` clauses and a fixed grammar
  ([GAQL structure](https://developers.google.com/google-ads/api/docs/query/structure)), and the
  field catalog is "used by Google Ads API clients for validation and construction of Google Ads
  Query Language statements"
  ([field service](https://developers.google.com/google-ads/api/docs/concepts/field-service)).
  Recovery: discover valid fields with `listSearchableFields`, then fix the SELECT/FROM/WHERE.

## Rate limits / access tiers

- **Basic vs Standard.** Basic Access allows "15,000 operations / day for both test and
  production accounts"; Standard Access allows "Unlimited operations / day for both test and
  production accounts" and "an unlimited number of operations per day for most services"
  ([access levels](https://developers.google.com/google-ads/api/docs/access-levels)).
- **Per-request cap.** "A mutate request cannot contain more than 10,000 operations per request"
  ([quotas](https://developers.google.com/google-ads/api/docs/best-practices/quotas)). This
  connector sends a single operation per mutate, so it stays well under the cap.

## Status enums

- Campaigns, ad groups, and ads use **ENABLED / PAUSED / REMOVED**. Conversion actions use
  **ENABLED / REMOVED / HIDDEN**.
- **REMOVED is permanent.** "When you remove a campaign, you stop it permanently. You cannot
  resume or restore a removed campaign", whereas pausing "is temporary … You can resume the
  campaign at any time and all settings and history are preserved"
  ([enable, pause, or remove a campaign](https://support.google.com/google-ads/answer/2404259?hl=en)).
  `setCampaignStatus` to `REMOVED` cannot be undone — prefer `PAUSED` to stop a campaign you may
  want back. Removed records still appear in reports; filter them with `status != 'REMOVED'`
  (the list tools default to this).

## Conversion tracking

- **Conversion action types** include `UPLOAD_CLICKS`, `WEBPAGE`, and `AD_CALL`, among others.
  For offline / upload conversion tracking the action type is `UPLOAD_CLICKS`: "for offline
  conversions using click IDs, the conversion_action_type must be UPLOAD_CLICKS … to track ads
  that led to sales in the offline world, such as over the phone or through a sales rep"
  ([upload clicks](https://developers.google.com/google-ads/api/docs/conversions/upload-clicks)).
  `createConversionAction` only creates the action definition; it does not upload conversions.
- **2026 changes for uploads (offline conversions + Customer Match).** Creating a conversion
  action is unaffected, but actually _uploading_ offline conversions or managing Customer Match
  is gated, and new integrations are routed to the Data Manager API:
  - Offline conversions: "Starting June 15, 2026, UploadClickConversion requests will fail if
    the developer token hasn't previously sent requests to upload offline conversions or
    enhanced conversions for leads." Google directs you to "Use the Data Manager API instead"
    ([manage offline conversions](https://developers.google.com/google-ads/api/docs/conversions/upload-offline),
    corroborated on [upload clicks](https://developers.google.com/google-ads/api/docs/conversions/upload-clicks)).
  - Customer Match: "As of April 1, 2026, most new Customer Match integrations must use the
    Data Manager API"; "Existing eligible integrations can continue to use the Google Ads API
    for managing customer lists"
    ([manage Customer Match](https://developers.google.com/google-ads/api/docs/remarketing/audience-segments/customer-match/manage)).

  This connector does not upload conversions or manage Customer Match audiences, so it isn't
  subject to these gates — but anything you build downstream of a conversion action you create
  here is.

## API versioning

- The major version lives in the path: `v23` in
  `https://googleads.googleapis.com/v23/...`
  ([REST overview](https://developers.google.com/google-ads/api/rest/overview)).
- Google ships major versions on a roughly quarterly cadence: from the public release notes,
  v22 (2025-10-15), v23 (2026-01-28), and v24 (2026-04-22) landed about three to four months
  apart, i.e. ~three major versions per year
  ([release notes](https://developers.google.com/google-ads/api/docs/release-notes)). Older
  versions sunset over time, so pin and upgrade deliberately.
