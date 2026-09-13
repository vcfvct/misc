# CCCG recurring booking form — test setup


`create-recurring-form.js` is a standalone Google Apps Script builder for a **new,
unpublished test form** and a **new response spreadsheet**. It does not read or
change the live form, send emails, create calendar events, or install triggers.
No API key, password, or OAuth token needs to be shared with the coding assistant.

**Next step after creating the form:** the separate `recurring-approval.js` test
integration supports approval emails and recurring calendar series. Follow
[APPROVAL_SETUP.md](APPROVAL_SETUP.md) to configure, deploy, and test it. 

## Create the test form

1. Sign in to the Google account that should own the church form and spreadsheet.
2. Open <https://script.google.com/> and click **New project**.
3. Name it `CCCG recurring booking form builder`.
4. Replace the contents of the default `Code.gs` file with the entire contents of
   **`create-recurring-form.js`**. Use a new project, not the live approval project.
5. In **Project Settings**, set the timezone to **America/New_York**. The builder
   sets the new spreadsheet timezone separately to the same value.
6. Save. Select **`createRecurringBookingForm`** in the function dropdown and click
   **Run**. Do not select a helper function.
7. Review Google's authorization prompt. This code creates Forms and Sheets in
   your account; authorize it only after reviewing the code. A Workspace admin
   may need to allow Apps Script. No separate API key or Cloud API setup is needed.
8. Open the **Execution log** and copy the form editor and spreadsheet links.
   The responder link is also logged but is not usable until publication/access
   settings are reviewed below.

Re-running the setup function after success prints the same links; it does not
create another form or duplicate questions. Editing the builder and running again
will NOT update an already-created form.

## Review access and publish for testing

The script deliberately leaves the new form **unpublished**.

1. Open its editor link and review the questions/section routing.
2. Under **Settings → Responses**, check that Google-account email collection and
   **Limit to 1 response** are off. The required `Email Address` question is a
   normal email-validated text field, not a verified Google account email.
3. In **Publish / Manage responder access** (wording varies), set responder
   general access to **Anyone with the link**, not your organization or a list
   of named accounts. Publish when ready to test.
4. Open the copied responder link in an **incognito/private window while signed
   out**. Verify that it can actually be completed without signing in. An optional
   sign-in suggestion for saving progress is different from a mandatory sign-in.
5. Keep the editor and response spreadsheet restricted to authorized church staff.
   Do not publish responses or share the sheet publicly.

Publication alone is not a guarantee of anonymous responder access. FormApp does
not expose a documented general-access setter, and Workspace policy can prevent
public responses. If public access is unavailable, ask the account administrator;
this script does not override organizational policy.

An unverified email field can contain someone else's address. Before enabling
public approval automation, consider abuse controls and how to verify requests.

## Questions and routes

All dates include the year. Start/end times use native Time widgets (time of day,
not duration). Start/end dates describe the **first occurrence**, including
bookings that end on a later day. All recurrence times are America/New_York local
time, not a fixed UTC offset.

English scheduling titles are stable future spreadsheet headers, with Chinese
help text. Existing Chinese room/description titles are retained. Participant
count is intentionally changed from checkboxes to a single-choice question.

```text
Request details + first occurrence + Repeat Type
  Does not repeat -----------------------------------> Acknowledgment -> Submit
  Weekly -> Interval + weekdays -> Repeat ending ----> Acknowledgment -> Submit
  Monthly -> Interval + Monthly Pattern
               Day of month -> Date 1–31 -----------\
               Weekday of month -> Position + day ---+-> Repeat ending
                                                          -> Acknowledgment -> Submit
```

Supported inputs:

- Weekly: every 1, 2, 3, or 4 weeks, on one or more weekdays.
- Monthly: every 1, 2, 3, or 6 months, either:
  - A date from 1–31; months without that date are intended to be skipped.
  - First, second, third, fourth, or last occurrence of a weekday.
- Required `Repeat Until` on repeating paths, inclusive of the last occurrence's
  start date. No forever option.
- Same rooms and start/end time pattern across a series; use separate requests
  for different schedules.

There is no separate last-calendar-day-of-month option or holiday exception
picker in this first version.

### Spreadsheet question headers

Do not depend on numeric column positions. The response sheet also adds its own
Timestamp column. Scheduling questions have unique titles:

- `Email Address`
- `Event Title`
- `Applicant Name`
- `Start Date`, `Start Time`, `End Date`, `End Time`
- `参与人数`, `申请使用区域`, `活动介绍`
- `Repeat Type`
- `Repeat Every — Weeks`, `Repeat On — Weekdays`
- `Repeat Every — Months`, `Monthly Pattern`
- `Monthly Day`, `Monthly Week Position`, `Monthly Weekday`
- `Repeat Until`
- `Acknowledgment`

Keep question titles stable when implementing the approval handler. Branch-specific
fields are normally blank for skipped paths; the future handler must select fields
based on `Repeat Type` / `Monthly Pattern`, not merely on which cells are nonempty.
Checkbox responses from a spreadsheet form-submit trigger are commonly represented
as a comma-separated string inside the `e.namedValues` array, not one array element
per selected checkbox. Inspect real test responses when implementing parsing.

## Manual acceptance tests

After publishing for testing, manually submit dummy data using an email you control:

1. **Does not repeat:** skips all recurrence questions and reaches acknowledgment.
2. **Weekly:** shows interval and weekdays; skips monthly questions; requires an end date.
3. **Monthly / Day of month:** shows month interval and date; skips weekday-position questions.
4. **Monthly / Weekday of month:** shows position and weekday; skips day-of-month question.
5. Use **Back** to change a path and confirm the final selected path works.
6. Confirm required questions in skipped sections do not block submission.
7. Confirm a signed-out respondent can submit and a row reaches the new response sheet.
8. Inspect actual date/time cell values and headers in that sheet before connecting automation.

The builder does not submit any responses itself.

## What the form builder does not do

Native Forms cannot compare dates across questions or validate a complete
recurrence rule. A separate test implementation now exists in
`recurring-approval.js`; see [APPROVAL_SETUP.md](APPROVAL_SETUP.md) for implemented
policies, limitations, and deployment instructions. The following remain the
integration checklist to verify end-to-end before real bookings, not features of
the form builder itself:

- Validate end after start, first-date/rule agreement, repeat-until bounds, and the
  proposed maximum of **12 months from the first occurrence**. These are currently
  help text, not enforced rules. Decide interval anchoring and overlap policy.
- Combine separate date/time answers reliably using America/New_York, including
  daylight-saving transitions and overnight events; do not add fixed 168-hour
  offsets for weekly wall-clock schedules.
- Read columns by header and store request status/event identifiers in explicitly
  named administrative columns.
- Include rooms, applicant details, and the entire recurrence schedule in approval
  emails and calendar details.
- Create a real recurring event series, including correct monthly weekday rules.
  Monthly ordinal weekdays may warrant the Calendar API's RRULE support rather
  than assuming every pattern is expressible in the CalendarApp convenience API.
- Check every occurrence for conflicts in the requested rooms, not merely whether
  any calendar event exists at that time. Consider conflicts within a series too.
- Handle manager authorization, unguessable request identifiers, confirmation
  before state-changing actions, concurrent clicks, duplicate prevention, failure
  recovery, and calendar-event IDs.
- Decide cancellation/edit behavior for approved series.


The original `onFormSubmit(e)` expects a **spreadsheet installable form-submit
trigger** (`e.range`, `e.namedValues`), not a Forms-source submit trigger. The form
builder installs neither. The future approval web app should target an explicit
spreadsheet and response tab, not rely on an active sheet.

## Partial failure / starting over

The builder records progress in the project's script property
`CCCG_RECURRING_FORM_SETUP_V1` and uses a script lock to prevent concurrent runs.
If setup fails, it leaves already-created resources intact and blocks automatic
retry to avoid silent duplication.

1. Check **Executions / Execution log** for the error and resource links. The script
   property also contains any recorded resource IDs and links.
2. Review the partial draft and sheet; fix them manually or move only these test
   resources to Trash if they are not needed.
3. To intentionally start a fresh setup, open **Project Settings → Script
   properties** and delete only `CCCG_RECURRING_FORM_SETUP_V1`, then rerun. This
   creates NEW resources; deleting the property does not delete the old resources.

## Local verification

No package installation is required; use a modern Node.js version (18+):

```sh
node --check create-recurring-form.js
node --check recurring-approval.js
node --test test/*.test.js
```

These are offline mock tests for draft settings, field structure, section routing,
recurrence rules, approval security/state handling, rerun behavior, and failure
recovery. They do not prove Google authorization, actual Forms rendering, public
access, Calendar rendering, or response-cell serialization; complete the manual
tests above and in APPROVAL_SETUP.md in your account.

## References

- [Forms conditional sections](https://support.google.com/docs/answer/141062?hl=en)
- [FormApp](https://developers.google.com/apps-script/reference/forms/form-app)
- [Form settings and publishing](https://developers.google.com/apps-script/reference/forms/form)
- [PageBreakItem routing](https://developers.google.com/apps-script/reference/forms/page-break-item)
  — its `setGoToPage` controls navigation after the section **before** that page
  break; answer-based choice routing overrides it.
