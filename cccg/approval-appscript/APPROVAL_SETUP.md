# Recurring booking approval — TEST deployment

`recurring-approval.js` is a **separate, undeployed test integration** for the new
recurring form. The assistant has not sent email, changed your Google files, created events, or
deployed anything. You run and authorize the code in your Google account.

## Configuration already filled in

| Setting | Value |
| --- | --- |
| Spreadsheet | `1Smg_h5u_BUgmjWPueF_AIGZFM84zN2EREScEUzKnays` |
| Response tab | `Form Responses 1` |
| Approver inbox | `cccgadm@gmail.com` |
| Timezone | `America/New_York` |
| Test response row | `2` |
| Approval link lifetime | 14 days from sending |

The provided `cid` was a base64-encoded calendar link parameter. The decoded
Calendar API ID used in the script is:

```text
07dc83abac2029718c493d8277c04f8d926406c26450bff86582ad86d3abb7c1@group.calendar.google.com
```

**Confirm this is your isolated TEST calendar before approving anything.** The
script checks its timezone but cannot tell whether it is a production calendar.
All approval emails, confirmation emails, and newly created events are marked
`[TEST]`. The Google account deploying/running the script needs edit access to the
spreadsheet and permission to create events on this calendar.

The only unfinished configuration value is `APPROVAL_CONFIG.webAppUrl`, obtained
when you deploy below. Do not provide an API key, password, or OAuth token to the
assistant.

## 1. Create a separate Apps Script project

1. Open <https://script.google.com/> under the account that will run the integration.
2. Create a **new project**, e.g. `CCCG Recurring Approval TEST`.
3. Replace `Code.gs` with the entire contents of **`recurring-approval.js`**.
   Do not paste the Node test files into Apps Script.
4. Set **Project Settings → Timezone** to `America/New_York`.
5. In the response spreadsheet, check **File → Settings**:
   - Locale: **United States** (`en_US`)
   - Timezone: **Eastern Time / America/New_York**
6. In Google Calendar settings for the test calendar, set its timezone to
   **America/New_York** as well.
7. In the Apps Script editor, click **Services → + → Google Calendar API → Add**
   (version **v3**, identifier **Calendar**). This is the advanced Calendar service,
   not `CalendarApp`. For the default Apps Script Cloud project, adding the service
   normally enables its API automatically. With a manually attached standard
   Cloud project, also enable the Google Calendar API in that project's Cloud console.
8. Save.

The form already sends responses to the sheet. This new project uses a
**spreadsheet installable form-submit trigger**, not a Forms-source trigger.

## 2. Initialize and preview without email/event side effects

Select **`setupBookingApproval`** and click **Run**. Review and authorize Google's
permission prompt. Workspace administrators may need to allow the project.

Setup will:

- Read the calendar metadata to verify its timezone.
- Check the response headers, spreadsheet locale and timezone.
- Append named `Booking ...` administrative columns after existing columns.
- Generate a private signing secret in **Script Properties**.

Setup will **not** send mail, create calendar events, or install a trigger.
Repeated setup keeps existing admin columns and signing secret.

Protect the response sheet, administrative columns, script project, and Script
Properties from untrusted editors. Do not share the signing secret. Setup does
not change your sharing permissions automatically.

Next, select **`previewTestBooking`** and run it. This is read-only. With your
original row 2, expect:

```text
Every 1 week(s) on Sunday
First occurrence: 2026-09-13 11:00:00 → 2026-09-13 14:00:00
Occurrences: 11; last start date: 2026-11-22
First occurrence UTC: 2026-09-13T15:00:00.000Z
Last occurrence UTC: 2026-11-22T16:00:00.000Z
RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SU;WKST=MO;UNTIL=20261123T045959Z
```

The different UTC hours are intentional: the series stays at 11 am local time
across daylight-saving changes. The UTC UNTIL falls on the following date because
it represents 11:59:59 pm Eastern on November 22.

Preview permits historical dates, but **actual approval refuses a first occurrence
that is already in the past**. If you are testing after September 13, 2026, submit
a new test response with future dates and change `testRow` to its row number.

## 3. Deploy the review/confirmation web app

1. Choose **Deploy → New deployment → Web app**.
2. Set **Execute as: Me** (the account with sheet/calendar access).
3. For signed-link access without a mandatory Google login, set **Who has access:
   Anyone**, if your account policy permits it.
4. Deploy and copy the web app URL ending in **`/exec`**, not `/dev`.
5. Paste it into the script's `APPROVAL_CONFIG.webAppUrl`:

   ```javascript
   webAppUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
   ```

6. Save, then **Deploy → Manage deployments → Edit (pencil) → Version: New version
   → Deploy**. This is essential: editing code does not update the deployed version.
   Update the same deployment so its URL stays unchanged.

The empty URL in the first deployed version is expected; do not send an approval
email until the updated version containing the URL has been deployed.

The form's anonymous responder access and the web app's access settings are
separate. If your organization prevents public web apps, do not try to circumvent
that policy; select a permitted access mode and test it with the approver.

### Security model — read before use

- This prototype authorizes decisions with **unguessable, HMAC-signed, expiring
  bearer links** sent only to the configured approver inbox.
- **It does not authenticate that the clicker is `cccgadm@gmail.com`.** A person
  holding a forwarded/leaked link can review and decide that request until expiry.
  Do not forward links or paste them into public chats/issues. If authenticated
  manager identity is required, add a proper sign-in/allowlist design before
  production. `Session.getActiveUser().getEmail()` is not reliably available in
  execute-as-owner web apps and is not used as a false identity check here.
- GET renders a review page and performs a **read-only live calendar check** for
  pending requests. It never changes sheet status, sends email or creates events.
  A separate **POST confirmation** is required to approve or reject. Ordinary link
  previews cannot approve by fetching the URL (but can consume calendar-read quota).
- The signature binds the request ID, snapshot digest, nonce and expiry. Changed
  details invalidate the old approval; resending rotates the nonce and link.
- Links use a stable request UUID, not a guessable/mutable sheet row number.
- No Google OAuth access token is exposed in the web page.
- The calendar and sheet may contain email addresses and applicant details;
  restrict their sharing appropriately.

## 4. Send one test approval manually

Before this step, confirm that row `testRow` is dummy data and its submitter email
belongs to someone who expects a test message. Only the **manager** receives the
initial approval email; the **submitter** gets a real confirmation/decline email
when you confirm a decision.

1. Set `testRow` to the row to process (default `2`). Save.
2. Run **`sendTestBookingApproval`** from the editor.
3. Check `cccgadm@gmail.com` for `[TEST] Approval required: ...`.
4. Open its private review link. Confirm the complete schedule, rooms and applicant,
   and read the availability panel:
   - **No room conflicts found:** all requested occurrences were checked; approval
     and rejection are available.
   - **Room conflict found:** shows the first detected conflict, the existing event
     title, and requested/existing times in Eastern Time. Approval is disabled;
     you can immediately reject and notify the requester.
   - **Unable to verify availability:** a calendar/API check failed, not a confirmed
     conflict. Approval is disabled; refresh to retry. Rejection remains available.
5. Click **Confirm APPROVE entire schedule** or **Confirm REJECT request**.
   If resolving a conflict instead of rejecting, click **Refresh availability**
   afterward. Approval always checks again on POST, even after a clear preview.
6. Check the sheet's `Booking Status`, notes and event ID, the test calendar, and
   the submitter's inbox.

Running the send helper again for a pending/corrected row resends its approval
email and **invalidates earlier links**. It does not resend for an Approved,
Rejected, or Creating request. It never approves by itself.

Do not edit response/admin fields or manually move events while a request is
being decided. Script locks coordinate this project's executions, not human
spreadsheet edits or external calendar writers.

## 5. Test all paths before enabling automatic emails

Use separate dummy requests for these cases:

- **One-time approval:** one calendar event; no recurrence.
- **Weekly:** your sample should produce 11 occurrences. Confirm both before/after
  the November 1 daylight-saving transition remain 11 am–2 pm.
- **Every two weeks, several weekdays:** interval weeks explicitly begin Monday.
  For a first Sunday, the Monday immediately after it belongs to the next week,
  not the same interval week. This matches `WKST=MO` in the calendar rule.
- **Monthly / day 31:** February and other months without the 31st are skipped.
- **Monthly / second Sunday** and **last Friday:** verify the actual dates.
- **Reject:** no event created, submitter gets the rejection message.
- **Duplicate confirmation:** no second series or reversed decision.
- **Later-occurrence conflict:** put a busy test event on a later requested date;
  opening the review link should show the conflict before any decision. Verify
  approval is disabled, rejection is available, and viewing alone sends no mail
  or changes to the sheet. Reject and confirm the submitter receives an email.
- **Resolved conflict:** remove only the test conflict and refresh the review page;
  approval should become available without resending the approval link.
- **Changed availability:** open a clear review page, then create a conflicting
  test event before clicking Approve. The POST must still stop without creating
  a series and provide a link back to review, where the manager can reject.
- **Calendar failure:** if permissions/API access fail, the page must show unknown
  availability, not "no conflicts". Rejection should still work.
- **Recovery/final states:** a Creating request offers recovery, not rejection;
  approved/rejected reviews do not scan the calendar or report their own event
  as a conflict.
- **Invalid schedule:** mismatched first weekday, end before start, missing/unbounded
  Repeat Until, overlapping occurrences, or daylight-saving gap/ambiguous time.
  Queueing should mark `Needs correction`, with an explanation in `Booking Notes`.
- **Changed sheet response:** old approval must fail; an owner-reviewed resend
  must be required.
- **Public responder submission:** confirm date/time display formats match the
  spreadsheet settings and branch fields arrive under the expected headers.

A conflict preview leaves the request **Pending** and does not write notes, send
email, create a partial series, or automatically reject it. An actual approval
POST blocked by a conflict still records the error in `Booking Notes`. The
requester is notified only when the manager explicitly rejects or successfully
approves the request. The manager's email and review preview are not reservations.

### Updating an existing test deployment

Replace the Apps Script code with the updated `recurring-approval.js`, preserving
YOUR configured `webAppUrl` and other local settings. Then use **Deploy → Manage
deployments → Edit → New version → Deploy** on the same deployment. No new sheet
columns, trigger changes, or form changes are needed for the review-page preview.
Existing unexpired approval links still work if the deployment URL and signing
secret are unchanged.

## 6. Enable new-response processing only when ready

Run **`installBookingSubmitTrigger`** once under the intended owner account.
Then check the clock-shaped **Triggers** panel:

- Function: `onBookingFormSubmit`
- Source: **From spreadsheet**
- Event type: **On form submit**
- Spreadsheet: the configured new response spreadsheet

The installer avoids duplicating this handler's trigger for the current account.
Do not run it under multiple owner accounts; accounts cannot necessarily see each
other's installed triggers. Existing rows are not processed automatically. Use
`sendTestBookingApproval` on individual older test rows deliberately.

**After installation, real new submissions send real approval emails.** Keep the
form's distribution limited during testing and monitor quotas/Executions. To stop
these emails, delete this project's `onBookingFormSubmit` trigger in the Triggers
panel. That does not revoke already-sent approval links; disable the web deployment
or rotate the signing secret as well if you need to disable those links immediately.

## Validation and conflict policies

Implemented in this test script, not in the native form UI:

- First occurrence must match the chosen recurrence pattern.
- Repeat Until includes the last allowed **start** date and is bounded to 12 months
  from the first start date. At most 400 occurrences.
- Each occurrence may end on a later date, but at most 7 calendar days later; all
  occurrences must have positive duration and not overlap each other.
- Dates/times are parsed from the displayed US-format sheet cells. Keep the
  response date/time cell formats readable as `M/D/YYYY` (or ISO `YYYY-MM-DD`) and
  `h:mm[:ss] AM/PM` (or 24-hour `HH:mm[:ss]`); do not customize them to omit years.
- Local times are converted using `America/New_York`, not the server's timezone
  or fixed seven-day millisecond additions. DST gaps and ambiguous repeated-hour
  times are rejected, not silently shifted.
- A series whose occurrences would have different elapsed durations because a
  DST transition falls **inside** one occurrence is rejected. Split exceptional
  occurrences into separate requests rather than risk a calendar duration mismatch.
- Google Calendar API RRULEs create true recurring series, including ordinal
  monthly weekdays. Start/end explicitly carry the named timezone.
- The review preview and approval POST share the same read-only conflict scanner.
  It expands existing calendar series and follows pagination; a clear result means
  every proposed occurrence was checked. It stops at the first detected conflict
  (the displayed conflict is not an exhaustive list). More than 10,000 returned
  calendar items fails closed; shorten the request period rather than ignore
  unchecked conflicts. POST rechecks under the script lock immediately before
  inserting; the preview is advisory and does not reserve rooms.
- Busy events created by this workflow have room metadata. They only conflict
  when at least one requested room overlaps. **Untagged or malformed busy events
  conservatively block all rooms.** Adding a room name only in a manually created
  event's location does not make it a tagged booking.
- Transparent/free events and cancelled events do not block. All-day busy events
  do block. Back-to-back bookings are allowed (no setup/cleanup buffer implemented).
- Calendar checks and inserts are protected from concurrent decisions **within
  this project** by a script lock. Google Calendar does not offer an atomic
  room-check-and-reserve transaction here; manual calendar changes or another
  automation can race with approval. This is not resource-calendar auto-booking.

## Administrative states and recovery

| Status | Meaning / next action |
| --- | --- |
| Blank | Not yet queued |
| Needs correction | Invalid input; see notes. Correct/review and explicitly resend |
| Pending | Approval link sent or email attempt failed; see mail timestamp/notes |
| Creating | Calendar insertion was started; it may have succeeded despite a timeout |
| Approved | Calendar creation/recovery succeeded; notification may still need retry |
| Rejected | Final rejection; no event created by the rejection path |

Creation uses a deterministic Calendar event ID derived from the request UUID.
After an uncertain insertion failure, retry approval: it checks for **that same
ID** and reconciles the stored snapshot before inserting anything. It will not
reject a `Creating` request because the calendar event may already exist.

If the link has expired, the owner can set `testRow` and run
**`recoverTestBookingDecision`** from the script editor. This only handles
`Creating`, `Approved`, or `Rejected`; it does not approve a previously undecided
Pending request. For an expired Pending request, use `sendTestBookingApproval` to
issue a new link.

If a final submitter email fails, status stays Approved/Rejected and notes record
the failure. A repeated confirmation or the owner recovery helper retries the
notification without recreating the event. Mail and Sheets are not transactional:
if email delivery succeeds but saving the sent marker fails, a retry may send a
duplicate email. Calendar insertion retry is separately protected by its stable ID.

Do not erase request IDs, reset statuses, or copy administrative cells to another
row to force a retry. Deleted/modified calendar events and changed snapshots may
require manual reconciliation. Approved-series edits/cancellations, holiday
exceptions, migration of existing bookings, account-authenticated approver audit,
and abuse/rate-limit controls are **not implemented**. Invalid submissions are
recorded in the sheet, not automatically emailed back to the submitter.

The no-sign-in form accepts unverified email addresses. Before production, decide
how to handle fake/spam requests, email quotas, authenticated approvals, access
control and privacy. Keep this deployment in test mode until those decisions and
real Google end-to-end tests are complete.

## Local verification

```sh
node --check recurring-approval.js
node --test test/*.test.js
```

Tests use offline mocks for Google services and real timezone rules through Node's
Intl implementation. They test recurrence/date logic, routing from the form
builder, room checks, link validation, state handling and retry behavior. They do
not send mail or verify actual Google OAuth/deployment permissions, Apps Script
Utilities behavior, Calendar recurrence rendering or Sheet response serialization.
Validate those using the manual tests above.

## Google references

- [Advanced Calendar service](https://developers.google.com/apps-script/advanced/calendar)
- [Calendar event insertion and RRULE fields](https://developers.google.com/calendar/api/v3/reference/events/insert)
- [Expanded event listing](https://developers.google.com/calendar/api/v3/reference/events/list)
- [Apps Script web app deployment](https://developers.google.com/apps-script/guides/web)
