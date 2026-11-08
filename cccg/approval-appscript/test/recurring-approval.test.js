// Offline Apps Script/Calendar/Mail mocks. No network, real emails, or real events.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'recurring-approval.js'), 'utf8')
    .replace("webAppUrl: '',", "webAppUrl: 'https://script.google.com/macros/s/TEST_DEPLOYMENT/exec',")
    // The fixture always puts its response in row 2, independent of the owner's testRow setting.
    .replace(/testRow:\s*\d+/, 'testRow: 2');
const HEADERS = [
    'Timestamp', 'Email Address', 'Event Title', 'Applicant Name', 'Start Date', 'Start Time',
    'End Date', 'End Time', '参与人数', '申请使用区域', '活动介绍', 'Repeat Type',
    'Repeat Every — Weeks', 'Repeat On — Weekdays', 'Repeat Every — Months', 'Monthly Pattern',
    'Monthly Day', 'Monthly Week Position', 'Monthly Weekday', 'Repeat Until', 'Acknowledgment'
];
const SAMPLE = {
    Timestamp: '9/12/2026 21:40:00', 'Email Address': 'requester@example.com',
    'Event Title': 'han test', 'Applicant Name': 'Test Applicant',
    'Start Date': '9/13/2026', 'Start Time': '11:00:00 AM', 'End Date': '9/13/2026',
    'End Time': '2:00:00 PM', '参与人数': '<10', '申请使用区域': '团契厅',
    '活动介绍': "Han's test event", 'Repeat Type': 'Weekly', 'Repeat Every — Weeks': '1',
    'Repeat On — Weekdays': 'Sunday', 'Repeat Until': '11/22/2026',
    Acknowledgment: 'I understand / 我已了解'
};

function formatDate(date, timezone, pattern) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
    const p = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
    if (pattern === 'yyyy-MM-dd HH:mm:ss') return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
    assert.equal(pattern, 'Z');
    const minutes = Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - date.getTime()) / 60000);
    return (minutes < 0 ? '-' : '+') + String(Math.floor(Math.abs(minutes) / 60)).padStart(2, '0') + String(Math.abs(minutes) % 60).padStart(2, '0');
}

function harness(overrides = {}) {
    let uuid = 0;
    const data = [HEADERS.slice(), HEADERS.map((header) => ({ ...SAMPLE, ...overrides })[header] || '')];
    const properties = new Map();
    const sent = [];
    const events = new Map();
    const logs = [];
    const metaTags = [];
    const triggers = [];
    const controls = { calendarItems: [], mailFailTo: '', insertTimeoutOnce: false, calendarTimezone: 'America/New_York', now: Date.parse('2026-09-12T12:00:00Z') };
    const stats = { writes: 0, inserts: 0, lists: 0, releases: 0, triggers: 0 };
    const sheet = {
        getName: () => 'Form Responses 1',
        getLastRow: () => data.length,
        getLastColumn: () => data[0].length,
        getMaxColumns: () => 100,
        insertColumnsAfter: () => {},
        getRange: (row, column, rows = 1, columns = 1) => ({
            getDisplayValues: () => Array.from({ length: rows }, (_, y) =>
                Array.from({ length: columns }, (_, x) => String(data[row - 1 + y]?.[column - 1 + x] ?? ''))),
            setValue: (value) => {
                stats.writes++;
                data[row - 1] ||= [];
                data[row - 1][column - 1] = String(value).replace(/^'/, '');
            }
        })
    };
    const spreadsheet = {
        getSpreadsheetTimeZone: () => 'America/New_York',
        getSpreadsheetLocale: () => 'en_US',
        getSheetByName: (name) => name === 'Form Responses 1' ? sheet : null
    };
    class Clock extends Date {
        constructor(...args) { super(...(args.length ? args : [controls.now])); }
        static now() { return controls.now; }
    }
    const context = vm.createContext({
        Date: Clock,
        console: { log: (message) => logs.push(message), error: (message) => logs.push(message) },
        Utilities: {
            formatDate,
            getUuid: () => '00000000-0000-4000-8000-' + String(++uuid).padStart(12, '0'),
            computeDigest: (_, text) => [...crypto.createHash('sha256').update(text).digest()],
            computeHmacSha256Signature: (text, secret) => [...crypto.createHmac('sha256', secret).update(text).digest()],
            DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }
        },
        PropertiesService: { getScriptProperties: () => ({
            getProperty: (key) => properties.get(key), setProperty: (key, value) => properties.set(key, value)
        }) },
        SpreadsheetApp: { openById: (id) => {
            assert.equal(id, '1Smg_h5u_BUgmjWPueF_AIGZFM84zN2EREScEUzKnays'); return spreadsheet;
        }, flush: () => {} },
        LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => { stats.releases++; } }) },
        HtmlService: { createHtmlOutput: (html) => ({
            addMetaTag: (name, content) => { metaTags.push({ name, content }); return html; }
        }) },
        MailApp: { sendEmail: (message) => {
            if (message.to === controls.mailFailTo) throw new Error('Mail quota exceeded');
            sent.push(message);
        } },
        Calendar: {
            Calendars: { get: (id) => {
                assert.equal(id, '07dc83abac2029718c493d8277c04f8d926406c26450bff86582ad86d3abb7c1@group.calendar.google.com');
                return { timeZone: controls.calendarTimezone, summary: 'TEST calendar' };
            } },
            Events: {
                get: (_, id) => {
                    if (controls.getFailure) throw new Error(controls.getFailure);
                    if (!events.has(id)) throw new Error('Not Found');
                    return events.get(id);
                },
                list: (_, options) => {
                    stats.lists++;
                    if (controls.listFailure) throw new Error(controls.listFailure);
                    assert.equal(options.singleEvents, true);
                    if (controls.listPages) return controls.listPages[Number(options.pageToken || 0)];
                    return { items: controls.calendarItems };
                },
                insert: (event, _, options) => {
                    assert.equal(options.sendUpdates, 'none');
                    if (events.has(event.id)) throw new Error('Already exists');
                    stats.inserts++;
                    event.htmlLink = 'https://example.test/event/' + event.id;
                    events.set(event.id, event);
                    if (controls.insertTimeoutOnce) {
                        controls.insertTimeoutOnce = false;
                        throw new Error('Network timeout after server accepted event');
                    }
                    return event;
                }
            }
        },
        ScriptApp: {
            getProjectTriggers: () => triggers,
            newTrigger: (handler) => ({ forSpreadsheet: (id) => ({ onFormSubmit: () => ({ create: () => {
                stats.triggers++;
                triggers.push({ getHandlerFunction: () => handler, getTriggerSourceId: () => id });
            } }) }) })
        }
    });
    vm.runInContext(source, context);
    const row = () => Object.fromEntries(data[0].map((title, index) => [title, data[1][index] || '']));
    const change = (title, value) => { data[1][data[0].indexOf(title)] = value; };
    const plan = (values = {}) => context.planBooking(context.parseBooking({ ...SAMPLE, ...values }));
    const setup = () => context.setupBookingApproval();
    const queue = () => context.sendTestBookingApproval();
    const params = () => {
        const link = sent.findLast((message) => message.to === 'cccgadm@gmail.com').body.match(/https:\/\/script\.google\.com\/\S+/)[0];
        return Object.fromEntries(new URL(link).searchParams);
    };
    const post = (decision, values = params()) => context.doPost({ parameter: { ...values, decision } });
    return { context, data, sheet, row, change, plan, setup, queue, params, post, controls, stats, sent, events, properties, logs, metaTags, spreadsheet };
}

const dates = (plan) => Array.from(plan.occurrences, (occurrence) => occurrence.date);

test('sample is 11 Sundays with 11am local start across DST, and inclusive UNTIL', () => {
    const h = harness();
    const plan = h.plan();
    assert.equal(plan.occurrences.length, 11);
    assert.equal(dates(plan)[0], '2026-09-13');
    assert.equal(dates(plan).at(-1), '2026-11-22');
    assert.equal(new Date(plan.occurrences[0].start).toISOString(), '2026-09-13T15:00:00.000Z');
    assert.equal(new Date(plan.occurrences.at(-1).start).toISOString(), '2026-11-22T16:00:00.000Z');
    assert.equal(plan.rrule, 'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SU;WKST=MO;UNTIL=20261123T045959Z');
    assert.match(h.context.bookingSummary(plan), /Occurrences: 11/);
});

test('one-time overnight booking ignores stale recurrence fields', () => {
    const plan = harness().plan({ 'Repeat Type': 'Does not repeat', 'Start Time': '11:30 PM', 'End Date': '9/14/2026', 'End Time': '1:00 AM', 'Repeat Until': 'garbage' });
    assert.equal(plan.rrule, null);
    assert.equal(plan.occurrences.length, 1);
    assert.equal(plan.occurrences[0].end - plan.occurrences[0].start, 90 * 60000);
});

test('every-two-weeks uses Monday anchored weeks including multiple weekdays', () => {
    const plan = harness().plan({
        'Repeat Every — Weeks': '2', 'Repeat On — Weekdays': 'Monday, Sunday', 'Repeat Until': '10/4/2026'
    });
    assert.deepEqual(dates(plan), ['2026-09-13', '2026-09-21', '2026-09-27']);
    assert.match(plan.rrule, /BYDAY=SU,MO;WKST=MO/);
});

test('monthly day 31 skips missing dates, including February, rather than rolling forward', () => {
    const plan = harness().plan({
        'Start Date': '1/31/2027', 'End Date': '1/31/2027', 'Repeat Type': 'Monthly',
        'Repeat Every — Months': '1', 'Monthly Pattern': 'Day of month', 'Monthly Day': '31', 'Repeat Until': '5/31/2027'
    });
    assert.deepEqual(dates(plan), ['2027-01-31', '2027-03-31', '2027-05-31']);
    assert.match(plan.rrule, /BYMONTHDAY=31/);
});

test('monthly second Sunday and last Friday produce ordinal RRULEs', () => {
    const h = harness();
    const second = h.plan({
        'Repeat Type': 'Monthly', 'Repeat Every — Months': '1', 'Monthly Pattern': 'Weekday of month',
        'Monthly Week Position': 'Second', 'Monthly Weekday': 'Sunday', 'Repeat Until': '12/13/2026'
    });
    assert.deepEqual(dates(second), ['2026-09-13', '2026-10-11', '2026-11-08', '2026-12-13']);
    assert.match(second.rrule, /BYDAY=2SU/);
    const last = h.plan({
        'Start Date': '9/25/2026', 'End Date': '9/25/2026', 'Repeat Type': 'Monthly',
        'Repeat Every — Months': '1', 'Monthly Pattern': 'Weekday of month',
        'Monthly Week Position': 'Last', 'Monthly Weekday': 'Friday', 'Repeat Until': '12/31/2026'
    });
    assert.deepEqual(dates(last), ['2026-09-25', '2026-10-30', '2026-11-27', '2026-12-25']);
    assert.match(last.rrule, /BYDAY=-1FR/);
});

test('date/time parsers validate real dates, AM/PM boundaries, leap years and format', () => {
    const c = harness().context;
    assert.equal(c.parseBookingDate('2/29/2028'), '2028-02-29');
    assert.equal(c.bookingYearLimit('2028-02-29'), '2029-02-28');
    assert.equal(c.parseBookingTime('12:00 AM'), '00:00:00');
    assert.equal(c.parseBookingTime('12:00:00 PM'), '12:00:00');
    assert.equal(c.parseBookingTime('23:59'), '23:59:00');
    for (const date of ['2/29/2027', '2/30/2028', '13/1/2027', '', '9/13/26']) assert.throws(() => c.parseBookingDate(date));
    for (const time of ['24:00', '13:00 AM', '0:00 PM', '11:99', '11:00:99', '']) assert.throws(() => c.parseBookingTime(time));
});

test('rejects invalid rule matches, unbounded/missing end dates and overlapping occurrences', () => {
    const h = harness();
    assert.throws(() => h.plan({ 'Repeat On — Weekdays': 'Monday' }), /does not match/);
    assert.throws(() => h.plan({ 'Repeat Until': '' }), /Invalid date/);
    assert.throws(() => h.plan({ 'Repeat Until': '9/14/2027' }), /within 12 months/);
    assert.throws(() => h.plan({ 'End Time': '10:00 AM' }), /End must be after/);
    assert.throws(() => h.plan({ 'Repeat Every — Weeks': '0' }), /Invalid weekly interval/);
    assert.throws(() => h.plan({ '申请使用区域': 'Unknown room' }), /Invalid requested room/);
    assert.throws(() => h.plan({ 'Repeat On — Weekdays': 'Sunday, Monday', 'End Date': '9/14/2026' }), /overlap each other/);
    assert.throws(() => h.plan({ 'Email Address': 'x@example.com,attacker@example.com' }), /Invalid email/);
});

test('rejects DST gaps, ambiguous times and variable-duration recurring events', () => {
    const h = harness();
    assert.throws(() => h.context.bookingInstant('2027-03-14', '02:30:00'), /Nonexistent or ambiguous/);
    assert.throws(() => h.context.bookingInstant('2026-11-01', '01:30:00'), /Nonexistent or ambiguous/);
    assert.throws(() => h.plan({
        'Start Date': '10/25/2026', 'End Date': '10/25/2026', 'Start Time': '12:30 AM',
        'End Time': '3:30 AM', 'Repeat Until': '11/1/2026'
    }), /changing its duration/);
});

test('setup appends admin columns once, preserves room column J, and has no mail/event/trigger effects', () => {
    const h = harness();
    const original = h.data[0].length;
    h.setup();
    const after = h.data[0].length;
    assert.ok(after > original);
    h.setup();
    assert.equal(h.data[0].length, after);
    assert.equal(h.data[0][9], '申请使用区域');
    assert.equal(h.data[1][9], '团契厅');
    assert.equal(h.sent.length, 0);
    assert.equal(h.stats.inserts, 0);
    assert.equal(h.stats.triggers, 0);
    assert.equal(h.properties.size, 1);
    const beforePreview = h.stats.writes;
    h.context.previewTestBooking();
    assert.equal(h.stats.writes, beforePreview);
});

test('queue emails manager only; GET is read-only and escapes user HTML; bad tokens cannot mutate', () => {
    const h = harness({ 'Event Title': '<img src=x onerror=alert(1)>' });
    h.setup(); h.queue();
    assert.equal(h.sent.length, 1);
    assert.equal(h.sent[0].to, 'cccgadm@gmail.com');
    assert.equal(h.row()['Booking Status'], 'Pending');
    const before = h.stats.writes;
    const page = h.context.doGet({ parameter: h.params() });
    assert.match(page, /&lt;img/);
    assert.doesNotMatch(page, /<img/);
    assert.match(page, /method="post"/);
    assert.equal(h.stats.writes, before);
    assert.match(h.post('approve', { ...h.params(), token: 'a'.repeat(64) }), /Invalid or expired/);
    assert.equal(h.stats.writes, before);
    assert.equal(h.stats.inserts, 0);
});

test('approval creates one series with room metadata; repeated or opposing clicks do not duplicate/reverse', () => {
    const h = harness();
    h.setup(); h.queue();
    assert.match(h.post('approve'), /Approved/);
    const event = [...h.events.values()][0];
    assert.equal(event.recurrence.length, 1);
    assert.equal(event.start.timeZone, 'America/New_York');
    assert.equal(event.location, '团契厅');
    assert.match(event.id, /^[0-9a-v]{5,1024}$/);
    assert.equal(h.row()['Booking Status'], 'Approved');
    assert.ok(h.row()['Booking Calendar Event ID']);
    assert.equal(h.data[1][9], '团契厅');
    assert.equal(h.sent.length, 2);
    assert.equal(h.sent[1].to, 'requester@example.com');
    h.post('approve'); h.post('reject');
    assert.equal(h.stats.inserts, 1);
    assert.equal(h.sent.length, 2);
    assert.equal(h.row()['Booking Status'], 'Approved');
});

test('rejection creates no event and is final', () => {
    const h = harness(); h.setup(); h.queue();
    assert.match(h.post('reject'), /Rejected/);
    h.post('approve');
    assert.equal(h.row()['Booking Status'], 'Rejected');
    assert.equal(h.stats.inserts, 0);
    assert.equal(h.sent.length, 2);
});

test('invalid submissions are marked for correction without approval emails', () => {
    const h = harness({ 'Repeat On — Weekdays': 'Tuesday' }); h.setup(); h.queue();
    assert.equal(h.row()['Booking Status'], 'Needs correction');
    assert.equal(h.sent.length, 0);
    assert.match(h.row()['Booking Notes'], /does not match/);
});

test('changed response invalidates old approval and re-send rotates links', () => {
    const h = harness(); h.setup(); h.queue();
    const oldParams = h.params();
    h.change('End Time', '3:00:00 PM');
    assert.match(h.post('approve', oldParams), /Response changed/);
    assert.equal(h.stats.inserts, 0);
    h.queue();
    assert.match(h.post('approve', oldParams), /Invalid or expired/);
    assert.match(h.post('approve'), /Approved/);
});

test('expired links and invalid decisions do not create events', () => {
    const h = harness(); h.setup(); h.queue();
    assert.match(h.post('delete'), /Invalid decision/);
    h.controls.now += 15 * 86400000;
    assert.match(h.post('approve'), /Invalid or expired/);
    assert.equal(h.stats.inserts, 0);
});

test('stable request IDs survive whole-row sorting; duplicate IDs fail closed', () => {
    const h = harness(); h.setup(); h.queue();
    const params = h.params();
    h.data.splice(1, 0, HEADERS.map((header) => SAMPLE[header] || ''));
    assert.match(h.post('approve', params), /Approved/);
    assert.equal(h.data[2][h.data[0].indexOf('Booking Status')], 'Approved');
    h.data.push(h.data[2].slice());
    assert.match(h.post('approve', params), /duplicate request IDs/);
    assert.equal(h.stats.inserts, 1);
});

function busy(start, end, extra = {}) {
    return { summary: 'Other booking', start: { dateTime: start }, end: { dateTime: end }, ...extra };
}

test('checks later occurrences and all pages before creating anything', () => {
    const h = harness(); h.setup(); h.queue();
    h.controls.listPages = [
        { items: [], nextPageToken: '1' },
        { items: [busy('2026-11-22T17:00:00Z', '2026-11-22T18:00:00Z')] }
    ];
    assert.match(h.post('approve'), /Room conflict on 2026-11-22/);
    assert.equal(h.stats.lists, 2);
    assert.equal(h.stats.inserts, 0);
    assert.equal(h.row()['Booking Status'], 'Pending');
});

test('all-day busy events block; adjacent, transparent and different-room events do not', () => {
    const h = harness(); h.setup(); h.queue();
    h.controls.calendarItems = [{ summary: 'Closed', start: { date: '2026-10-04' }, end: { date: '2026-10-05' } }];
    assert.match(h.post('approve'), /Room conflict on 2026-10-04/);
    h.controls.calendarItems = [
        busy('2026-09-13T18:00:00Z', '2026-09-13T19:00:00Z'),
        busy('2026-09-13T16:00:00Z', '2026-09-13T17:00:00Z', { transparency: 'transparent' }),
        busy('2026-09-13T16:00:00Z', '2026-09-13T17:00:00Z', { extendedProperties: { private: {
            cccgBookingSource: '1Smg_h5u_BUgmjWPueF_AIGZFM84zN2EREScEUzKnays',
            cccgBookingRooms: JSON.stringify(['办公楼会议室'])
        } } })
    ];
    assert.match(h.post('approve'), /Approved/);
});

test('unknown room tags block conservatively and calendar permission failures never bypass checks', () => {
    const h = harness(); h.setup(); h.queue();
    h.controls.calendarItems = [busy('2026-09-13T16:00:00Z', '2026-09-13T17:00:00Z')];
    assert.match(h.post('approve'), /Room conflict/);
    h.controls.getFailure = 'Permission denied';
    assert.match(h.post('approve'), /Permission denied/);
    assert.equal(h.stats.inserts, 0);
});

test('ambiguous insert failure is recovered by ID, without duplicate series or premature approval', () => {
    const h = harness(); h.setup(); h.queue();
    h.controls.insertTimeoutOnce = true;
    assert.match(h.post('approve'), /Network timeout/);
    assert.equal(h.row()['Booking Status'], 'Creating');
    assert.equal(h.sent.length, 1);
    assert.match(h.post('reject'), /may already have occurred/);
    assert.match(h.post('approve'), /Approved/);
    assert.equal(h.row()['Booking Status'], 'Approved');
    assert.equal(h.stats.inserts, 1);
    assert.equal(h.sent.length, 2);
});

test('notification failure preserves approval; retry only sends email; owner can recover after expiry', () => {
    const h = harness(); h.setup(); h.queue();
    h.controls.mailFailTo = 'requester@example.com';
    assert.match(h.post('approve'), /notification failed/);
    assert.equal(h.row()['Booking Status'], 'Approved');
    assert.equal(h.row()['Booking Notification Sent'], '');
    h.controls.mailFailTo = '';
    h.controls.now += 15 * 86400000;
    h.context.recoverTestBookingDecision();
    assert.ok(h.row()['Booking Notification Sent']);
    assert.equal(h.stats.inserts, 1);
    assert.equal(h.sent.length, 2);
});

test('only explicit install helper creates a trigger; wrong trigger source is rejected', () => {
    const h = harness(); h.setup();
    assert.throws(() => h.context.onBookingFormSubmit({}), /spreadsheet form-submit trigger/);
    assert.equal(h.stats.triggers, 0);
    h.context.installBookingSubmitTrigger();
    h.context.installBookingSubmitTrigger();
    assert.equal(h.stats.triggers, 1);
});

test('column order is irrelevant and duplicate headers are rejected', () => {
    const h = harness();
    h.data.forEach((row) => row.reverse());
    h.setup(); h.queue();
    assert.match(h.post('approve'), /Approved/);
    assert.equal(h.row()['申请使用区域'], '团契厅');
    h.data[0].push('Event Title');
    assert.throws(h.setup, /Duplicate column header/);
});

test('signature binds snapshot, even if both response and stored snapshot are edited', () => {
    const h = harness(); h.setup(); h.queue();
    const params = h.params();
    h.change('Event Title', 'Changed after email');
    h.change('Booking Snapshot', JSON.stringify(h.context.parseBooking(h.row())));
    assert.match(h.post('approve', params), /Invalid or expired/);
    assert.equal(h.stats.inserts, 0);
});

test('deleted or mismatched recovery events are not silently recreated or approved', () => {
    const h = harness(); h.setup(); h.queue();
    h.controls.insertTimeoutOnce = true;
    h.post('approve');
    const event = [...h.events.values()][0];
    event.status = 'cancelled';
    assert.match(h.post('approve'), /does not match/);
    assert.equal(h.row()['Booking Status'], 'Creating');
    assert.equal(h.stats.inserts, 1);
});

test('past starts and changed calendar timezone fail before insert', () => {
    const h = harness(); h.setup(); h.queue();
    h.controls.calendarTimezone = 'UTC';
    assert.match(h.post('approve'), /Calendar timezone changed/);
    h.controls.calendarTimezone = 'America/New_York';
    h.controls.now = Date.parse('2026-09-14T12:00:00Z');
    assert.match(h.post('approve'), /first occurrence is in the past/);
    assert.equal(h.stats.inserts, 0);
});

test('monthly interval skips months and Repeat Until excludes subsequent occurrences', () => {
    const plan = harness().plan({
        'Repeat Type': 'Monthly', 'Repeat Every — Months': '2', 'Monthly Pattern': 'Day of month',
        'Monthly Day': '13', 'Repeat Until': '3/12/2027'
    });
    assert.deepEqual(dates(plan), ['2026-09-13', '2026-11-13', '2027-01-13']);
    assert.match(plan.rrule, /INTERVAL=2;BYMONTHDAY=13/);
});

test('review shows availability across every calendar page without side effects', () => {
    const h = harness(); h.setup(); h.queue();
    h.controls.listPages = [{ items: [], nextPageToken: '1' }, { items: [] }];
    const writes = h.stats.writes;
    const page = h.context.doGet({ parameter: h.params() });
    assert.match(page, /No room conflicts found/);
    assert.match(page, /Checked all 11 requested occurrence/);
    assert.match(page, /value="approve">/);
    assert.match(page, /value="reject">/);
    assert.match(page, /Refresh availability/);
    assert.equal(h.stats.lists, 2);
    assert.equal(h.stats.writes, writes);
    assert.equal(h.sent.length, 1);
    assert.equal(h.stats.inserts, 0);
});

test('review exposes a later conflict safely and manager can immediately reject and notify', () => {
    const h = harness(); h.setup(); h.queue();
    h.controls.listPages = [{ items: [], nextPageToken: '1' }, { items: [
        busy('2026-11-22T17:00:00Z', '2026-11-22T18:00:00Z', { summary: '<img src=x onerror=alert(1)>' })
    ] }];
    const writes = h.stats.writes;
    const page = h.context.doGet({ parameter: h.params() });
    assert.match(page, /Room conflict found/);
    assert.match(page, /First detected conflict on <strong>2026-11-22/);
    assert.match(page, /2026-11-22 12:00:00/); // Existing event displayed in Eastern, not UTC.
    assert.match(page, /&lt;img/);
    assert.doesNotMatch(page, /<img/);
    assert.match(page, /value="approve" disabled/);
    assert.match(page, /value="reject">/);
    assert.equal(h.row()['Booking Status'], 'Pending');
    assert.equal(h.row()['Booking Notes'], '');
    assert.equal(h.stats.writes, writes);
    assert.equal(h.sent.length, 1);
    assert.match(h.post('reject'), /Rejected/);
    assert.equal(h.sent.length, 2);
    assert.equal(h.sent[1].to, 'requester@example.com');
    assert.equal(h.stats.inserts, 0);
    assert.equal(h.stats.lists, 2); // Reject does not need another calendar scan.
});

test('refresh rechecks a resolved conflict without reserving or notifying', () => {
    const h = harness(); h.setup(); h.queue();
    h.controls.calendarItems = [busy('2026-09-13T16:00:00Z', '2026-09-13T17:00:00Z')];
    const writes = h.stats.writes;
    assert.match(h.context.doGet({ parameter: h.params() }), /value="approve" disabled/);
    h.controls.calendarItems = [];
    assert.match(h.context.doGet({ parameter: h.params() }), /value="approve">/);
    assert.equal(h.stats.lists, 2);
    assert.equal(h.stats.writes, writes);
    assert.equal(h.stats.inserts, 0);
    assert.equal(h.sent.length, 1);
});

test('calendar failure shows unknown availability, disables approval, but leaves rejection usable', () => {
    const h = harness(); h.setup(); h.queue();
    h.controls.listFailure = 'Calendar unavailable <script>alert(1)</script>';
    const writes = h.stats.writes;
    const page = h.context.doGet({ parameter: h.params() });
    assert.match(page, /Unable to verify availability/);
    assert.doesNotMatch(page, /No room conflicts found/);
    assert.match(page, /&lt;script&gt;/);
    assert.doesNotMatch(page, /<script>/);
    assert.match(page, /value="approve" disabled/);
    assert.match(page, /value="reject">/);
    assert.equal(h.stats.writes, writes);
    assert.equal(h.sent.length, 1);
    assert.match(h.post('approve'), /Calendar unavailable/); // Cannot bypass UI via direct POST.
    assert.equal(h.stats.inserts, 0);
    assert.match(h.post('reject'), /Rejected/);
});

test('approval rechecks after a clear preview and links back to review if availability changed', () => {
    const h = harness(); h.setup(); h.queue();
    assert.match(h.context.doGet({ parameter: h.params() }), /No room conflicts found/);
    h.controls.calendarItems = [busy('2026-11-22T17:00:00Z', '2026-11-22T18:00:00Z')];
    const response = h.post('approve');
    assert.match(response, /Room conflict on 2026-11-22/);
    assert.match(response, /Return to review and refresh availability/);
    assert.equal(h.row()['Booking Status'], 'Pending');
    assert.equal(h.stats.inserts, 0);
    assert.equal(h.stats.lists, 2);
    assert.equal(h.sent.length, 1);
});

test('Creating and final review states skip scans to avoid conflicts with their own event', () => {
    const h = harness(); h.setup(); h.queue();
    h.controls.insertTimeoutOnce = true;
    h.post('approve');
    const lists = h.stats.lists;
    h.controls.listFailure = 'Must not scan the calendar in a recovery/final review';
    let page = h.context.doGet({ parameter: h.params() });
    assert.match(page, /Recover previous approval attempt/);
    assert.match(page, /value="approve">/);
    assert.match(page, /value="reject" disabled/);
    assert.equal(h.stats.lists, lists);
    h.post('approve'); // Recovers the existing event by ID; does not scan or reinsert.
    page = h.context.doGet({ parameter: h.params() });
    assert.match(page, /Retry notification if needed/);
    assert.doesNotMatch(page, /Room conflict found/);
    assert.doesNotMatch(page, /value="reject"/);
    assert.equal(h.stats.lists, lists);
    assert.equal(h.stats.inserts, 1);
    const rejected = harness(); rejected.setup(); rejected.queue(); rejected.post('reject');
    assert.match(rejected.context.doGet({ parameter: rejected.params() }), /decision is final/);
    assert.equal(rejected.stats.lists, 0);
});

test('invalid or expired review links cannot trigger calendar scans', () => {
    const h = harness(); h.setup(); h.queue();
    const params = h.params();
    assert.match(h.context.doGet({ parameter: { ...params, token: '0'.repeat(64) } }), /Invalid or expired/);
    h.controls.now += 15 * 86400000;
    assert.match(h.context.doGet({ parameter: params }), /Invalid or expired/);
    assert.equal(h.stats.lists, 0);
});

test('review fails closed if pagination fails or calendar item limit is exceeded', () => {
    const h = harness(); h.setup(); h.queue();
    // First page succeeds, but the next page is unavailable. Never claim the full series is clear.
    h.controls.listPages = [{ items: [], nextPageToken: '1' }];
    let page = h.context.doGet({ parameter: h.params() });
    assert.match(page, /Unable to verify availability/);
    assert.match(page, /value="approve" disabled/);
    h.controls.listPages = null;
    h.controls.calendarItems = Array.from({ length: 10001 }, () => ({ transparency: 'transparent' }));
    page = h.context.doGet({ parameter: h.params() });
    assert.match(page, /Too many calendar items/);
    assert.match(page, /Unable to verify availability/);
    assert.match(page, /value="approve" disabled/);
    assert.doesNotMatch(page, /No room conflicts found/);
});

test('decision buttons have responsive accessible styles without changing form behavior', () => {
    const h = harness(); h.setup(); h.queue();
    const page = h.context.doGet({ parameter: h.params() });
    assert.match(page, /<form class="booking-actions"[^>]*method="post"[^>]*target="_top"/);
    assert.match(page, /class="booking-button booking-button--approve" type="submit" name="decision" value="approve">/);
    assert.match(page, /class="booking-button booking-button--reject" type="submit" name="decision" value="reject">/);
    assert.match(page, /min-height:\s*56px/);
    assert.match(page, /font-size:\s*18px/);
    assert.match(page, /\.booking-button:focus-visible/);
    assert.match(page, /\.booking-button:disabled\s*\{[^}]*cursor:\s*not-allowed/s);
    assert.match(page, /@media \(max-width: 600px\)/);
    assert.deepEqual(h.metaTags.at(-1), { name: 'viewport', content: 'width=device-width, initial-scale=1' });
    h.controls.calendarItems = [busy('2026-09-13T16:00:00Z', '2026-09-13T17:00:00Z')];
    const conflictPage = h.context.doGet({ parameter: h.params() });
    assert.match(conflictPage, /class="booking-button booking-button--approve"[^>]*value="approve" disabled/);
    assert.equal(h.sent.length, 1);
    assert.equal(h.stats.inserts, 0);
    h.post('reject');
    const finalPage = h.context.doGet({ parameter: h.params() });
    assert.match(finalPage, /class="booking-button booking-button--secondary"/);
    assert.match(finalPage, />Retry notification if needed<\/button>/);
    assert.doesNotMatch(finalPage, /value="reject"/);
});
