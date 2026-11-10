# CMDA–Dispatch marketing connector

This implementation connects CMDA member data and preferences to Dispatch campaigns. Source code has been written only. It has not been built, type-checked, tested, migrated, started, or connected to a live provider.

Managed CMDA audiences require a current member link when counting recipients, preparing campaigns, enrolling journeys, and processing sends. A manually added contact cannot receive a managed-audience campaign or journey solely through list membership. Older collector snapshots cannot overwrite newer source snapshots.

## Ownership and scope

CMDA remains authoritative for member identity, names, role/category/region, membership payment status, account availability, and marketing preferences. Dispatch owns campaigns, templates, email engagement, suppression records, and delivery operations. CMDA's existing EmailService, Resend/SMTP routing, password resets, verification emails, receipts and payment logic were not changed.

CMDA `subscribed` continues to mean paid membership. It is projected into `cmda_paid_membership` and never interpreted as newsletter consent. Marketing requires an active, non-banned, non-deleted member, marketing opt-in, an enabled email channel, fresh synchronization, and no applicable suppression/archive. Email-verification status is available as an additional audience filter rather than an undocumented eligibility rule.

## Source locations

- CMDA backend: `C:/Users/NEWUSER/Documents/new-project/cmda-backend/src/dispatch-integration/`.
- CMDA registration: `src/app.module.ts`.
- Preference causality markers: `src/users/schema/users.schema.ts`.
- Canonical preferences and re-consent: `src/users/users.service.ts` and `dto/user-settings.dto.ts`.
- Member web preferences: `new-project/frontend/src/pages/Dashboard/Settings/Settings.jsx`.
- Member mobile preferences: `new-project/CMDA-Mobile/screens/more/settings/SettingsScreen.tsx`.
- Dispatch receiver/feedback worker: `outputs/backend/src/integrations/cmda/`.
- Dispatch UI: `outputs/frontend/src/product/CmdaIntegrationPage.tsx`, available from CMDA connection and Settings.

No new application dependencies were introduced. The connector uses existing CMDA Nest/Mongoose/Axios/scheduler libraries and existing Dispatch Nest/PostgreSQL/Zod libraries plus Node cryptography/fetch.

## Setup for later execution

1. Stop old Dispatch workers before schema upgrades. Apply all outstanding SQL migrations through 005 using the existing migration runner. Migrations 004 and 005 add CMDA mappings, feedback outbox, nonce/receipt tables, a managed list flag and deferred form-trigger records.
2. Merge `cmda-backend/dispatch.env.example` into the CMDA environment and the CMDA entries from Dispatch `.env.example` into the Dispatch environment. No active `.env` files were changed.
3. Generate two distinct random secrets of at least 32 characters through your normal secret-management process:
   - CMDA `DISPATCH_SYNC_SECRET` = Dispatch `CMDA_SYNC_SECRET`.
   - CMDA `DISPATCH_FEEDBACK_SECRET` = Dispatch `CMDA_FEEDBACK_SECRET`.
4. Set CMDA `DISPATCH_API_URL` to the Dispatch origin. Set Dispatch `CMDA_FEEDBACK_URL` to the CMDA `/integrations/dispatch/feedback` endpoint. Production URLs require HTTPS. Ensure each container/server can reach the other by its configured address; localhost inside a container refers to that container.
5. Enable both flags and start the existing CMDA worker and Dispatch worker when ready. CMDA collector execution requires PROCESS_ROLE=worker, which its existing worker entry point sets. Both flags remain false by default.
6. Keep Dispatch in dry-run mode until the validation below is allowed and completed. No emails were sent or provider resources configured during this task.

The two applications default to port 3000; use distinct ports/origins or their reverse proxies. Existing frontend Nginx forwards `/api/*`, including the integration receiver. The CMDA API must expose its signed feedback/control endpoints to the Dispatch worker.

## Synchronization behavior

The CMDA worker scans recent member changes every scheduled pass, batching collection and outbound work. It uses a durable per-member sync registry with monotonic revisions, stable event IDs, bounded network timeouts, row/document claims, backoff and explicit failed records. Mongo state holds collection cursors and a worker lease. Failed HTTP requests do not fail CMDA member operations.

A full reconciliation runs initially, when requested, and approximately every six hours. It catches existing imports, bulk writes, membership-expiry changes and removed/role-changed members. Registry entries missing from the CMDA member set become tombstones that retire their Dispatch contact. Heartbeats refresh unchanged members. Backfills are batched and can take multiple worker passes; this is eventual synchronization, not synchronous mirroring.

Only Student, Doctor and GlobalNetwork member records are projected. A stable CMDA Mongo member ID maps to a Dispatch contact UUID. Email changes retain old contact/message history, retire the previous address for marketing, and link the current address to the same CMDA member. A collision with another member's linked email is rejected for review. Existing unlinked contacts with the same email may be linked; their protected suppressions and manual archive state are retained.

The first accepted sync creates a managed CMDA audience, source-owned custom fields, and starter segments for opted-in doctors in Nigeria membership, students and Global Network members. CMDA names/fields are edited in CMDA; Dispatch preserves local tags and lead scoring. The managed audience cannot be deleted through the product API.

## Consent and feedback

Unsubscribe handlers write a PostgreSQL feedback outbox in the same transaction as the local opt-out. SES delivery/permanent-bounce/complaint events enqueue corresponding feedback. The independent Dispatch feedback loop retries delivery to CMDA without blocking campaign queue processing. Public confirmed re-subscriptions defer managed-contact workflow triggers until CMDA consent is synchronized.

CMDA stores feedback with unique event IDs and payload hashes. Marketing feedback updates only marketing preference, never membership/payment state. Delivery/bounce/complaint events are retained for staff visibility; they do not set paid-subscription flags. Suppression still happens locally in Dispatch before the callback succeeds.

Each Dispatch opt-out advances a consent sequence. An older positive CMDA snapshot cannot override it, even after an email-address change. To re-enable marketing, a later explicit CMDA choice must acknowledge the current sequence. GET `/users/settings` returns `marketingConsentVersion`; a renewed opt-in after an opt-out requires `marketingConsentConfirmed: true` and that version. Updated web/mobile forms send changed settings only and explicitly confirm positive marketing choices. Older clients can still opt out, but must refresh/use the updated consent flow to re-enable marketing after a Dispatch opt-out.

The member document's notificationPreferences is canonical when present, with legacy settings as a fallback. GET settings overlays canonical member preferences so a delayed settings mirror cannot display an old positive value. Repeated/reordered feedback is deduplicated and consent sequence checks exclude older updates.

Permanent bounce/complaint suppressions are not cleared by opt-in sync. Manual suppression and archive state are also preserved. Marketing sends recheck CMDA eligibility/freshness at dispatch/claim time. The default maximum synchronization age is 24 hours; stale linked records are excluded. A queued message already in a provider request cannot be recalled.

## Protocol and endpoints

Requests use HMAC-SHA256 over `timestamp + '.' + nonce + '.' + canonicalJson(body)`. Canonical JSON recursively sorts object keys. Headers are X-CMDA-Timestamp, X-CMDA-Nonce and X-CMDA-Signature. Timestamp skew is limited to five minutes; unique persisted nonces prevent replay. Each retry gets a new request nonce while retaining the business event ID/revision. Both servers need reasonably synchronized clocks.

Service endpoints:

- Dispatch POST `/api/integrations/cmda/members` — signed CMDA member projection.
- CMDA POST `/integrations/dispatch/feedback` — signed feedback.
- CMDA POST `/integrations/dispatch/control` — signed rescan, status or failed-member retry.

Dispatch admin endpoints under `/api/v1/manage/integrations/cmda`:

- GET status — linked/eligible/stale counts, last transfer times and feedback outcomes.
- POST rescan — request CMDA full reconciliation.
- POST source/status — inspect CMDA collector/delivery status and failed rows.
- POST source/:memberId/retry — retry a failed member update.
- POST feedback/:id/retry — retry failed outbound feedback.

CMDA staff endpoints:

- GET `/admin/dispatch/status` and `/admin/dispatch/feedback?memberId=...&page=1` for SuperAdmin/MemberManager.
- POST `/admin/dispatch/rescan` and `/admin/dispatch/members/:id/retry` for SuperAdmin.

Signed endpoints bypass member JWT login but require their dedicated HMAC guard. CMDA feedback/control bypass generic request throttling to accommodate delivery bursts; unsigned/expired/replayed requests are rejected. Admin controls retain each application's normal role checks. Sync secrets and password/token fields are never exposed in integration status or copied into contact data.

## Required validation before enabling live sending

These are future checks, not checks performed during implementation:

- Build/type checks and regression tests in all edited repositories; render the new Dispatch page and changed member preferences on web/mobile.
- Initial backfill, duplicate/reordered updates, email changes/collisions, inactive/banned/deleted records and reconciliation restart.
- Member categories/regions and paid membership remain distinct from opt-in eligibility.
- Unsubscribe while CMDA is unavailable: local sending stops and feedback survives restart.
- Older positive snapshots, out-of-order callbacks, explicit re-consent and stale preference forms.
- Duplicate permanent-bounce/complaint feedback and source callback failure/retry.
- Both workers stopped/restarted, expired nonce/claims, stale-member exclusion and recovery.
- Confirm ordinary CMDA transactional emails remain on their existing provider path.

Staff sign-on between CMDA and Dispatch, replacing CMDA's bulk-email screen, and migrating all Mautic entities are subsequent milestones. This connector does not create those features or claim a tested live connection.
