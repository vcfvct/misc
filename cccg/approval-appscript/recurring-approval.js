// NEW standalone Apps Script project; do not combine with the original main.js.
// Enable the advanced Google Calendar service (Calendar API v3). See APPROVAL_SETUP.md.
const APPROVAL_CONFIG = Object.freeze({
    spreadsheetId: '1Smg_h5u_BUgmjWPueF_AIGZFM84zN2EREScEUzKnays',
    sheetName: 'Form Responses 1',
    calendarId: '07dc83abac2029718c493d8277c04f8d926406c26450bff86582ad86d3abb7c1@group.calendar.google.com',
    managerEmails: ['cccgadm@gmail.com'],
    timezone: 'America/New_York',
    webAppUrl: '', // Paste the deployed /exec URL, then update the deployment version.
    testRow: 2,
    linkLifetimeDays: 14,
    maxOccurrences: 400,
    maxCalendarItems: 10000,
    secretProperty: 'CCCG_BOOKING_APPROVAL_SECRET_V1'
});

const BOOKING_HEADERS = [
    'Email Address', 'Event Title', 'Applicant Name', 'Start Date', 'Start Time',
    'End Date', 'End Time', '参与人数', '申请使用区域', '活动介绍', 'Repeat Type',
    'Repeat Every — Weeks', 'Repeat On — Weekdays', 'Repeat Every — Months',
    'Monthly Pattern', 'Monthly Day', 'Monthly Week Position', 'Monthly Weekday',
    'Repeat Until', 'Acknowledgment'
];
const BOOKING_ADMIN_HEADERS = [
    'Booking Status', 'Booking Request ID', 'Booking Snapshot', 'Booking Link Nonce',
    'Booking Link Expires', 'Booking Approval Email Sent', 'Booking Calendar Event ID',
    'Booking Calendar URL', 'Booking Decision At', 'Booking Notification Sent', 'Booking Notes'
];
const BOOKING_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BOOKING_DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const BOOKING_ROOMS = ['团契厅', '办公楼会议室', '办公楼厨房餐厅', '办公楼二楼'];
const BOOKING_DAY_MS = 86400000;

// ---- Owner-run setup and test helpers. These are NOT web endpoints. ----

function setupBookingApproval() {
    return withBookingLock(() => {
        const calendar = Calendar.Calendars.get(APPROVAL_CONFIG.calendarId);
        if (calendar.timeZone !== APPROVAL_CONFIG.timezone) {
            throw new Error('Set the TEST calendar timezone to ' + APPROVAL_CONFIG.timezone + ' before continuing.');
        }
        const store = openBookingStore(false);
        for (const header of BOOKING_ADMIN_HEADERS) {
            if (!store.columns[header]) {
                const column = store.sheet.getLastColumn() + 1;
                if (column > store.sheet.getMaxColumns()) store.sheet.insertColumnsAfter(store.sheet.getMaxColumns(), 1);
                store.sheet.getRange(1, column).setValue(header);
                store.columns[header] = column;
            }
        }
        const properties = PropertiesService.getScriptProperties();
        if (!properties.getProperty(APPROVAL_CONFIG.secretProperty)) {
            properties.setProperty(APPROVAL_CONFIG.secretProperty, Utilities.getUuid() + Utilities.getUuid());
        }
        console.log('Setup ready. Calendar: ' + calendar.summary + '. No trigger installed; no emails or events created.');
        console.log('Review APPROVAL_SETUP.md before deploying or installing the trigger.');
    });
}

function installBookingSubmitTrigger() {
    requireBookingWebAppUrl();
    approvalSecret();
    openBookingStore();
    const exists = ScriptApp.getProjectTriggers().some((trigger) =>
        trigger.getHandlerFunction() === 'onBookingFormSubmit' &&
        trigger.getTriggerSourceId() === APPROVAL_CONFIG.spreadsheetId);
    if (!exists) {
        ScriptApp.newTrigger('onBookingFormSubmit')
            .forSpreadsheet(APPROVAL_CONFIG.spreadsheetId).onFormSubmit().create();
    }
    console.log(exists ? 'Trigger already installed for this account.' : 'Spreadsheet form-submit trigger installed.');
}

/** Read-only preview of the configured test row. Does not send mail or write events. */
function previewTestBooking() {
    const store = openBookingStore(false);
    const plan = planBooking(parseBooking(readBookingRow(store, APPROVAL_CONFIG.testRow)));
    console.log(bookingSummary(plan));
    console.log('RRULE: ' + (plan.rrule || '(one-time event)'));
    console.log('First occurrence UTC: ' + new Date(plan.occurrences[0].start).toISOString());
    console.log('Last occurrence UTC: ' + new Date(plan.occurrences[plan.occurrences.length - 1].start).toISOString());
}

/** Explicitly sends/re-sends ONE approval request to the configured manager. */
function sendTestBookingApproval() {
    return queueBookingApproval(APPROVAL_CONFIG.testRow, true);
}

/** Owner-only editor helper for a Creating request or a failed final notification. */
function recoverTestBookingDecision() {
    return withBookingLock(() => {
        const store = openBookingStore();
        const rowNumber = APPROVAL_CONFIG.testRow;
        const row = readBookingRow(store, rowNumber);
        if (!['Creating', 'Approved', 'Rejected'].includes(row['Booking Status'])) {
            throw new Error('Recovery only applies to an attempted or completed decision, not a pending request.');
        }
        const request = parseBooking(row);
        if (JSON.stringify(request) !== row['Booking Snapshot']) throw new Error('Response changed. Owner must reconcile it with the calendar before recovery.');
        console.log(decideBooking({ store, rowNumber, row, plan: planBooking(request) }, 'approve'));
    });
}

function onBookingFormSubmit(e) {
    if (!e || !e.range || !e.source || e.source.getId() !== APPROVAL_CONFIG.spreadsheetId ||
        e.range.getSheet().getName() !== APPROVAL_CONFIG.sheetName) {
        throw new Error('Use a spreadsheet form-submit trigger for the configured response tab.');
    }
    return queueBookingApproval(e.range.getRow(), false);
}

// ---- Data access: all columns are resolved by header; row numbers are never link identifiers. ----

function openBookingStore(requireAdmin = true) {
    const spreadsheet = SpreadsheetApp.openById(APPROVAL_CONFIG.spreadsheetId);
    if (spreadsheet.getSpreadsheetTimeZone() !== APPROVAL_CONFIG.timezone ||
        spreadsheet.getSpreadsheetLocale() !== 'en_US') {
        throw new Error('Response spreadsheet must use locale United States (en_US) and timezone ' + APPROVAL_CONFIG.timezone + '.');
    }
    const sheet = spreadsheet.getSheetByName(APPROVAL_CONFIG.sheetName);
    if (!sheet) throw new Error('Response tab not found: ' + APPROVAL_CONFIG.sheetName);
    const titles = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    const columns = {};
    for (let index = 0; index < titles.length; index++) {
        const title = titles[index].trim();
        if (!title) continue;
        if (columns[title]) throw new Error('Duplicate column header: ' + title);
        columns[title] = index + 1;
    }
    for (const title of BOOKING_HEADERS.concat(requireAdmin ? BOOKING_ADMIN_HEADERS : [])) {
        if (!columns[title]) throw new Error('Missing column: ' + title + '. Run setup and check question titles.');
    }
    return { sheet, columns };
}

function readBookingRow(store, row) {
    if (!Number.isInteger(row) || row < 2 || row > store.sheet.getLastRow()) throw new Error('Invalid response row.');
    // Explicitly parse the displayed US dates and times, avoiding historical Date
    // offsets on time-only cells (often stored by Sheets on a date in 1899).
    const values = store.sheet.getRange(row, 1, 1, store.sheet.getLastColumn()).getDisplayValues()[0];
    const result = {};
    for (const [title, column] of Object.entries(store.columns)) result[title] = String(values[column - 1] || '').trim();
    return result;
}

function writeBookingAdmin(store, row, fields) {
    for (const [title, value] of Object.entries(fields)) {
        if (!BOOKING_ADMIN_HEADERS.includes(title) || !store.columns[title]) throw new Error('Invalid administrative column.');
        const text = String(value);
        // Write as text, not a formula, even if a third-party error starts with '='.
        store.sheet.getRange(row, store.columns[title]).setValue(/^[=+@-]/.test(text) ? "'" + text : text);
    }
    SpreadsheetApp.flush();
}

function findBookingRow(store, requestId) {
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw new Error('Invalid approval link.');
    const count = store.sheet.getLastRow() - 1;
    const rows = count > 0 ? store.sheet.getRange(2, store.columns['Booking Request ID'], count, 1).getDisplayValues() : [];
    const matches = [];
    rows.forEach((values, index) => { if (values[0] === requestId) matches.push(index + 2); });
    if (matches.length !== 1) throw new Error('Request not found or duplicate request IDs. Ask the owner to review the sheet.');
    return matches[0];
}

function withBookingLock(callback) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try { return callback(); } finally { lock.releaseLock(); }
}

// ---- Input validation and calendar-date arithmetic (independent of server timezone). ----

function requiredBookingText(value, label, maxLength) {
    const text = String(value || '').trim();
    if (!text || text.length > maxLength) throw new Error(label + ' is required and must be at most ' + maxLength + ' characters.');
    return text;
}

function bookingSelection(value, options, label) {
    if (!options.includes(value)) throw new Error('Invalid ' + label + '.');
    return value;
}

function bookingSelections(value, options, label) {
    const choices = String(value || '').split(',').map((item) => item.trim());
    choices.forEach((choice) => bookingSelection(choice, options, label));
    return [...new Set(choices)].sort((a, b) => options.indexOf(a) - options.indexOf(b));
}

function parseBooking(row) {
    const email = requiredBookingText(row['Email Address'], 'Email Address', 254);
    if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)) throw new Error('Invalid email address.');
    const request = {
        email,
        title: requiredBookingText(row['Event Title'], 'Event Title', 200),
        applicant: requiredBookingText(row['Applicant Name'], 'Applicant Name', 200),
        startDate: parseBookingDate(row['Start Date']),
        startTime: parseBookingTime(row['Start Time']),
        endDate: parseBookingDate(row['End Date']),
        endTime: parseBookingTime(row['End Time']),
        participants: bookingSelection(row['参与人数'], ['<10', '10 - 50', '50-100', '>100'], 'participant count'),
        rooms: bookingSelections(row['申请使用区域'], BOOKING_ROOMS, 'requested room'),
        description: String(row['活动介绍'] || '').trim(),
        repeat: bookingSelection(row['Repeat Type'], ['Does not repeat', 'Weekly', 'Monthly'], 'Repeat Type')
    };
    if (request.description.length > 4000) throw new Error('Activity description must be at most 4000 characters.');
    if (row.Acknowledgment !== 'I understand / 我已了解') throw new Error('Acknowledgment is required.');
    // Only selected-branch fields are considered, even if an old answer survives Back navigation.
    if (request.repeat !== 'Does not repeat') request.until = parseBookingDate(row['Repeat Until']);
    if (request.repeat === 'Weekly') {
        request.interval = Number(bookingSelection(row['Repeat Every — Weeks'], ['1', '2', '3', '4'], 'weekly interval'));
        request.weekdays = bookingSelections(row['Repeat On — Weekdays'], BOOKING_DAYS, 'weekday');
    }
    if (request.repeat === 'Monthly') {
        request.interval = Number(bookingSelection(row['Repeat Every — Months'], ['1', '2', '3', '6'], 'monthly interval'));
        request.monthlyPattern = bookingSelection(row['Monthly Pattern'], ['Day of month', 'Weekday of month'], 'monthly pattern');
        if (request.monthlyPattern === 'Day of month') {
            if (!/^(?:[1-9]|[12][0-9]|3[01])$/.test(row['Monthly Day'])) throw new Error('Invalid monthly day.');
            request.monthlyDay = Number(row['Monthly Day']);
        } else {
            request.position = bookingSelection(row['Monthly Week Position'], ['First', 'Second', 'Third', 'Fourth', 'Last'], 'monthly position');
            request.weekday = bookingSelection(row['Monthly Weekday'], BOOKING_DAYS, 'monthly weekday');
        }
    }
    return request;
}

function parseBookingDate(value) {
    const text = String(value || '').trim();
    const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!us && !iso) throw new Error('Invalid date: use M/D/YYYY or YYYY-MM-DD, including the year.');
    const year = Number(us ? us[3] : iso[1]);
    const month = Number(us ? us[1] : iso[2]);
    const day = Number(us ? us[2] : iso[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (year < 2000 || year > 2100 || date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
        throw new Error('Invalid calendar date (supported years: 2000–2100).');
    }
    return date.toISOString().slice(0, 10);
}

function parseBookingTime(value) {
    const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(String(value || '').trim());
    if (!match) throw new Error('Invalid time: use a native Time answer, such as 11:00:00 AM.');
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = Number(match[3] || 0);
    if (minute > 59 || second > 59 || (match[4] ? hour < 1 || hour > 12 : hour > 23)) throw new Error('Invalid time.');
    if (match[4]) hour = hour % 12 + (match[4].toUpperCase() === 'PM' ? 12 : 0);
    return [hour, minute, second].map((part) => String(part).padStart(2, '0')).join(':');
}

function bookingDayNumber(date) { return Date.parse(date + 'T00:00:00Z') / BOOKING_DAY_MS; }
function bookingDateAt(day) { return new Date(day * BOOKING_DAY_MS).toISOString().slice(0, 10); }
function bookingWeekday(date) { return new Date(date + 'T00:00:00Z').getUTCDay(); }

function bookingYearLimit(date) {
    const [year, month, day] = date.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year + 1, month, 0)).getUTCDate();
    return new Date(Date.UTC(year + 1, month - 1, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

/** Convert a local wall time to a unique instant. Reject DST gaps AND ambiguous times. */
function bookingInstant(date, time) {
    const local = date + ' ' + time;
    const nominal = Date.parse(date + 'T' + time + 'Z');
    const offsets = new Set();
    for (const delta of [-2 * BOOKING_DAY_MS, 0, 2 * BOOKING_DAY_MS]) {
        const offset = Utilities.formatDate(new Date(nominal + delta), APPROVAL_CONFIG.timezone, 'Z');
        const match = /^([+-])(\d{2})(\d{2})$/.exec(offset);
        if (!match) throw new Error('Could not determine calendar timezone offset.');
        offsets.add((match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) * 60000);
    }
    const candidates = [...offsets].map((offset) => nominal - offset).filter((instant) =>
        Utilities.formatDate(new Date(instant), APPROVAL_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss') === local);
    if (candidates.length !== 1) throw new Error('Nonexistent or ambiguous daylight-saving time: ' + local + '. Choose another time.');
    return candidates[0];
}

function bookingDateMatches(request, date) {
    if (request.repeat === 'Does not repeat') return date === request.startDate;
    const weekday = bookingWeekday(date);
    if (request.repeat === 'Weekly') {
        // Explicit Monday week start, matching WKST=MO in the Calendar RRULE.
        const weekStart = (value) => bookingDayNumber(value) - (bookingWeekday(value) + 6) % 7;
        const week = (weekStart(date) - weekStart(request.startDate)) / 7;
        return week % request.interval === 0 && request.weekdays.includes(BOOKING_DAYS[weekday]);
    }
    const [year, month, day] = date.split('-').map(Number);
    const [firstYear, firstMonth] = request.startDate.split('-').map(Number);
    if (((year - firstYear) * 12 + month - firstMonth) % request.interval !== 0) return false;
    if (request.monthlyPattern === 'Day of month') return day === request.monthlyDay;
    if (BOOKING_DAYS[weekday] !== request.weekday) return false;
    if (request.position === 'Last') return day + 7 > new Date(Date.UTC(year, month, 0)).getUTCDate();
    return Math.floor((day - 1) / 7) === ['First', 'Second', 'Third', 'Fourth'].indexOf(request.position);
}

function planBooking(request) {
    const startDay = bookingDayNumber(request.startDate);
    const endDay = bookingDayNumber(request.endDate);
    const daySpan = endDay - startDay;
    if (daySpan < 0 || daySpan > 7) throw new Error('End date must be on/after start date and no more than 7 days later.');
    const until = request.until || request.startDate;
    if (until < request.startDate || until > bookingYearLimit(request.startDate)) {
        throw new Error('Repeat Until must be on/after the first date and within 12 months of it.');
    }
    if (!bookingDateMatches(request, request.startDate)) throw new Error('First date does not match the selected repeat pattern.');
    const occurrences = [];
    let duration;
    for (let day = startDay; day <= bookingDayNumber(until); day++) {
        const date = bookingDateAt(day);
        if (!bookingDateMatches(request, date)) continue;
        const start = bookingInstant(date, request.startTime);
        const end = bookingInstant(bookingDateAt(day + daySpan), request.endTime);
        if (end <= start) throw new Error('End must be after start for every occurrence.');
        if (duration !== undefined && end - start !== duration) {
            throw new Error('This series crosses a daylight-saving change during an occurrence, changing its duration. Split that occurrence into a separate request.');
        }
        duration = end - start;
        if (occurrences.length && start < occurrences[occurrences.length - 1].end) throw new Error('Occurrences overlap each other.');
        occurrences.push({ date, start, end });
        if (occurrences.length > APPROVAL_CONFIG.maxOccurrences) throw new Error('Too many occurrences; shorten the booking period.');
    }
    let rrule = null;
    if (request.repeat !== 'Does not repeat') {
        const rules = ['FREQ=' + (request.repeat === 'Weekly' ? 'WEEKLY' : 'MONTHLY'), 'INTERVAL=' + request.interval];
        if (request.repeat === 'Weekly') {
            rules.push('BYDAY=' + request.weekdays.map((day) => BOOKING_DAY_CODES[BOOKING_DAYS.indexOf(day)]).join(','), 'WKST=MO');
        } else if (request.monthlyPattern === 'Day of month') {
            rules.push('BYMONTHDAY=' + request.monthlyDay);
        } else {
            const position = request.position === 'Last' ? -1 : ['First', 'Second', 'Third', 'Fourth'].indexOf(request.position) + 1;
            rules.push('BYDAY=' + position + BOOKING_DAY_CODES[BOOKING_DAYS.indexOf(request.weekday)]);
        }
        const endOfDate = new Date(bookingInstant(until, '23:59:59')).toISOString().replace(/[-:]/g, '').replace('.000', '');
        rules.push('UNTIL=' + endOfDate);
        rrule = 'RRULE:' + rules.join(';');
    }
    return { request, occurrences, rrule };
}

function bookingSummary(plan) {
    const r = plan.request;
    let schedule = 'One-time booking';
    if (r.repeat === 'Weekly') schedule = 'Every ' + r.interval + ' week(s) on ' + r.weekdays.join(', ');
    if (r.repeat === 'Monthly') {
        schedule = 'Every ' + r.interval + ' month(s), ' + (r.monthlyPattern === 'Day of month'
            ? 'day ' + r.monthlyDay + ' (months without this date skipped)'
            : r.position + ' ' + r.weekday);
    }
    return [
        'Event: ' + r.title, 'Applicant: ' + r.applicant + ' <' + r.email + '>',
        'Rooms: ' + r.rooms.join(', '), 'Participants: ' + r.participants,
        'First occurrence: ' + r.startDate + ' ' + r.startTime + ' → ' + r.endDate + ' ' + r.endTime,
        'Timezone: ' + APPROVAL_CONFIG.timezone, 'Schedule: ' + schedule,
        'Repeat Until: ' + (r.until || 'Not applicable'),
        'Occurrences: ' + plan.occurrences.length + '; last start date: ' + plan.occurrences[plan.occurrences.length - 1].date,
        'Description: ' + r.description
    ].join('\n');
}

// ---- Signed, expiring bearer links: possession authorizes a decision, not Google identity. ----

function approvalSecret() {
    const secret = PropertiesService.getScriptProperties().getProperty(APPROVAL_CONFIG.secretProperty);
    if (!secret) throw new Error('Run setupBookingApproval first.');
    return secret;
}

function bookingHex(bytes) { return bytes.map((byte) => (byte & 255).toString(16).padStart(2, '0')).join(''); }
function bookingHash(text) { return bookingHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)); }
function bookingToken(row) {
    return bookingHex(Utilities.computeHmacSha256Signature([
        row['Booking Request ID'], row['Booking Link Nonce'], row['Booking Link Expires'],
        bookingHash(row['Booking Snapshot'] || '')
    ].join('|'), approvalSecret(), Utilities.Charset.UTF_8));
}
function equalBookingToken(actual, expected) {
    if (!/^[0-9a-f]{64}$/.test(actual) || actual.length !== expected.length) return false;
    let difference = 0;
    for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
    return difference === 0;
}
function requireBookingWebAppUrl() {
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(APPROVAL_CONFIG.webAppUrl)) {
        throw new Error('Set webAppUrl to the deployed /exec URL and update the deployment.');
    }
    return APPROVAL_CONFIG.webAppUrl;
}

function queueBookingApproval(rowNumber, resend) {
    return withBookingLock(() => {
        const webAppUrl = requireBookingWebAppUrl();
        const store = openBookingStore();
        const row = readBookingRow(store, rowNumber);
        if (['Approved', 'Rejected', 'Creating'].includes(row['Booking Status'])) {
            console.log('Request is already decided or creation needs recovery; no approval email sent.');
            return;
        }
        if (!resend && row['Booking Approval Email Sent']) return;
        let plan;
        try { plan = planBooking(parseBooking(row)); } catch (error) {
            writeBookingAdmin(store, rowNumber, { 'Booking Status': 'Needs correction', 'Booking Notes': error.message });
            console.error('Row ' + rowNumber + ' needs correction: ' + error.message);
            return;
        }
        const fields = {
            'Booking Status': 'Pending',
            'Booking Request ID': row['Booking Request ID'] || Utilities.getUuid(),
            'Booking Snapshot': JSON.stringify(plan.request),
            'Booking Link Nonce': Utilities.getUuid(),
            'Booking Link Expires': String(Date.now() + APPROVAL_CONFIG.linkLifetimeDays * BOOKING_DAY_MS),
            'Booking Approval Email Sent': '', 'Booking Notes': ''
        };
        writeBookingAdmin(store, rowNumber, fields);
        const token = bookingToken(Object.assign({}, row, fields));
        const link = webAppUrl + '?rid=' + encodeURIComponent(fields['Booking Request ID']) + '&token=' + token;
        const body = '[TEST] Please review the ENTIRE requested schedule.\n\n' + bookingSummary(plan) +
            '\n\nReview and confirm approval/rejection:\n' + link +
            '\n\nThis private link authorizes a decision. Do not forward it. It expires in ' + APPROVAL_CONFIG.linkLifetimeDays + ' days.' +
            '\nRoom conflicts are checked on approval; submission does not reserve rooms.';
        try {
            MailApp.sendEmail({ to: APPROVAL_CONFIG.managerEmails.join(','), subject: '[TEST] Approval required: ' + plan.request.title.replace(/[\r\n]/g, ' '), body });
            writeBookingAdmin(store, rowNumber, { 'Booking Approval Email Sent': new Date().toISOString() });
        } catch (error) {
            writeBookingAdmin(store, rowNumber, { 'Booking Notes': 'Approval email failed: ' + error.message });
            throw error;
        }
        console.log('Approval email sent for row ' + rowNumber + '. No event created.');
    });
}

function authorizedBooking(e) {
    const parameters = e && e.parameter || {};
    const store = openBookingStore();
    const rowNumber = findBookingRow(store, String(parameters.rid || ''));
    const row = readBookingRow(store, rowNumber);
    const expires = Number(row['Booking Link Expires']);
    if (!row['Booking Link Nonce'] || !Number.isFinite(expires) || expires <= Date.now() ||
        !equalBookingToken(String(parameters.token || ''), bookingToken(row))) {
        throw new Error('Invalid or expired approval link. Ask the owner to resend the request.');
    }
    const request = parseBooking(row);
    if (JSON.stringify(request) !== row['Booking Snapshot']) {
        throw new Error('Response changed after the approval email. Ask the owner to review and resend; this link cannot approve changed details.');
    }
    return { store, rowNumber, row, plan: planBooking(request), token: parameters.token };
}

// ---- Calendar creation: stable event IDs allow safe retry after uncertain API failures. ----

function bookingEventId(requestId) { return 'cccg' + bookingHash(requestId); }
function getBookingEvent(eventId) {
    try { return Calendar.Events.get(APPROVAL_CONFIG.calendarId, eventId); } catch (error) {
        if (Number(error.code) === 404 || /\bnot found\b/i.test(error.message)) return null;
        throw error; // Never mistake a permission/quota/network failure for a missing event.
    }
}

function calendarEventRange(event) {
    const instant = (value) => {
        if (value && value.dateTime) {
            const result = Date.parse(value.dateTime);
            if (Number.isFinite(result)) return result;
        } else if (value && value.date) return bookingInstant(parseBookingDate(value.date), '00:00:00');
        throw new Error('Could not read an existing calendar event time; conflict check stopped.');
    };
    return { start: instant(event.start), end: instant(event.end) };
}

function calendarRoomsOverlap(event, requestedRooms) {
    const privateFields = event.extendedProperties && event.extendedProperties.private || {};
    // Untagged or malformed busy events conservatively block ALL rooms.
    if (privateFields.cccgBookingSource !== APPROVAL_CONFIG.spreadsheetId) return true;
    try {
        const rooms = JSON.parse(privateFields.cccgBookingRooms);
        if (!Array.isArray(rooms) || !rooms.length || rooms.some((room) => !BOOKING_ROOMS.includes(room))) return true;
        return rooms.some((room) => requestedRooms.includes(room));
    } catch (_) { return true; }
}

function checkBookingConflicts(plan) {
    if (Calendar.Calendars.get(APPROVAL_CONFIG.calendarId).timeZone !== APPROVAL_CONFIG.timezone) {
        throw new Error('Calendar timezone changed. Restore ' + APPROVAL_CONFIG.timezone + ' before checking room conflicts.');
    }
    const first = plan.occurrences[0];
    const last = plan.occurrences[plan.occurrences.length - 1];
    let pageToken;
    let count = 0;
    do {
        const options = {
            timeMin: new Date(first.start).toISOString(), timeMax: new Date(last.end).toISOString(),
            singleEvents: true, orderBy: 'startTime', showDeleted: false, maxResults: 2500,
            timeZone: APPROVAL_CONFIG.timezone
        };
        if (pageToken) options.pageToken = pageToken;
        const page = Calendar.Events.list(APPROVAL_CONFIG.calendarId, options);
        for (const event of page.items || []) {
            if (++count > APPROVAL_CONFIG.maxCalendarItems) throw new Error('Too many calendar items to safely check. Shorten the requested series.');
            if (event.status === 'cancelled' || event.transparency === 'transparent' || !calendarRoomsOverlap(event, plan.request.rooms)) continue;
            const range = calendarEventRange(event);
            const conflict = plan.occurrences.find((occurrence) => occurrence.start < range.end && range.start < occurrence.end);
            if (conflict) throw new Error('Room conflict on ' + conflict.date + ' with calendar event: ' + (event.summary || '(untitled)') + '. Nothing was created.');
        }
        pageToken = page.nextPageToken;
    } while (pageToken);
}

function bookingEventResource(plan, requestId) {
    const first = plan.occurrences[0];
    const event = {
        id: bookingEventId(requestId),
        summary: '[TEST] ' + plan.request.title,
        location: plan.request.rooms.join(', '),
        description: 'Approved CCCG TEST request.\n\n' + bookingSummary(plan),
        start: { dateTime: new Date(first.start).toISOString(), timeZone: APPROVAL_CONFIG.timezone },
        end: { dateTime: new Date(first.end).toISOString(), timeZone: APPROVAL_CONFIG.timezone },
        transparency: 'opaque',
        extendedProperties: { private: {
            cccgBookingSource: APPROVAL_CONFIG.spreadsheetId,
            cccgBookingRequestId: requestId,
            cccgBookingSnapshotHash: bookingHash(JSON.stringify(plan.request)),
            cccgBookingRooms: JSON.stringify(plan.request.rooms)
        } }
    };
    if (plan.rrule) event.recurrence = [plan.rrule];
    return event;
}

function assertBookingEventMatches(event, requestId, plan) {
    const fields = event.extendedProperties && event.extendedProperties.private || {};
    if (event.status === 'cancelled' || fields.cccgBookingRequestId !== requestId ||
        fields.cccgBookingSource !== APPROVAL_CONFIG.spreadsheetId ||
        fields.cccgBookingSnapshotHash !== bookingHash(JSON.stringify(plan.request))) {
        throw new Error('Existing calendar event does not match this request, or was deleted. Owner review required; no duplicate will be created.');
    }
}

function decideBooking(authorized, action) {
    const { store, rowNumber, row, plan } = authorized;
    const status = row['Booking Status'];
    if (['Approved', 'Rejected'].includes(status)) {
        return notifyBookingDecision(authorized, status); // Retry a failed notification, not the decision.
    }
    if (!['Pending', 'Creating'].includes(status)) throw new Error('This request is not pending approval. Ask the owner to review it.');
    if (action === 'reject') {
        if (status === 'Creating') throw new Error('Calendar creation may already have occurred. Retry approval recovery or ask the owner; do not reject yet.');
        writeBookingAdmin(store, rowNumber, { 'Booking Status': 'Rejected', 'Booking Decision At': new Date().toISOString(), 'Booking Notes': '' });
        return notifyBookingDecision(authorized, 'Rejected');
    }
    const requestId = row['Booking Request ID'];
    const eventId = bookingEventId(requestId);
    let event = getBookingEvent(eventId);
    if (event) assertBookingEventMatches(event, requestId, plan);
    else {
        if (plan.occurrences[0].start <= Date.now()) throw new Error('The first occurrence is in the past. Submit a new request with a future first occurrence.');
        checkBookingConflicts(plan);
        // If insertion fails ambiguously, leave Creating. A retry GETs the SAME event ID first.
        writeBookingAdmin(store, rowNumber, { 'Booking Status': 'Creating', 'Booking Calendar Event ID': eventId });
        event = Calendar.Events.insert(bookingEventResource(plan, requestId), APPROVAL_CONFIG.calendarId, { sendUpdates: 'none' });
        assertBookingEventMatches(event, requestId, plan);
    }
    writeBookingAdmin(store, rowNumber, {
        'Booking Calendar Event ID': eventId, 'Booking Calendar URL': event.htmlLink || '',
        'Booking Status': 'Approved', 'Booking Decision At': new Date().toISOString(), 'Booking Notes': ''
    });
    return notifyBookingDecision(authorized, 'Approved');
}

function notifyBookingDecision(authorized, status) {
    const { store, rowNumber, plan } = authorized;
    // Re-read after committing the decision; never turn an email failure into another event.
    const row = readBookingRow(store, rowNumber);
    if (row['Booking Notification Sent']) return 'This request is already ' + status + '. The submitter was notified.';
    try {
        MailApp.sendEmail({
            to: plan.request.email,
            subject: '[TEST] ' + status + ': ' + plan.request.title.replace(/[\r\n]/g, ' '),
            body: 'Your TEST booking request has been ' + status.toLowerCase() + '.\n\n' + bookingSummary(plan) +
                (status === 'Approved' ? '\n\nThe entire schedule was added to the TEST calendar. This is not a production reservation.' : '\n\nNo calendar event was created.')
        });
        writeBookingAdmin(store, rowNumber, { 'Booking Notification Sent': new Date().toISOString(), 'Booking Notes': '' });
        return 'Request ' + status + '. Submitter notified.';
    } catch (error) {
        writeBookingAdmin(store, rowNumber, { 'Booking Notes': 'Decision saved, notification failed: ' + error.message });
        console.error('Decision notification failed: ' + error.message);
        return 'Request ' + status + ', but notification failed. Retrying a confirmation will retry the email without recreating the event.';
    }
}

// ---- Web endpoints. GET only renders; POST confirms a decision under the script lock. ----

function bookingEscape(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
function bookingPage(body) {
    return HtmlService.createHtmlOutput('<!doctype html><html><head><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
        '<body style="font-family:Arial,sans-serif;max-width:850px;margin:2rem auto;padding:1rem">' + body + '</body></html>');
}
function bookingErrorPage(error) {
    console.error('Booking request failed: ' + error.message);
    return bookingPage('<h2>Request not processed</h2><p>' + bookingEscape(error.message) + '</p>');
}

function doGet(e) {
    try {
        const authorized = authorizedBooking(e);
        const status = authorized.row['Booking Status'];
        const final = ['Approved', 'Rejected'].includes(status);
        return bookingPage('<h2>[TEST] Review the entire booking</h2><p>Status: ' + bookingEscape(status) + '</p>' +
            '<pre style="white-space:pre-wrap">' + bookingEscape(bookingSummary(authorized.plan)) + '</pre>' +
            '<p>This private link authorizes a decision. Do not forward it. Opening this page changes nothing.</p>' +
            (final ? '<p>The decision is final. The button only retries a notification if needed.</p>' : '<p>Approval checks the requested rooms for every occurrence before creating the series.</p>') +
            '<form method="post" action="' + bookingEscape(requireBookingWebAppUrl()) + '" target="_top">' +
            '<input type="hidden" name="rid" value="' + bookingEscape(authorized.row['Booking Request ID']) + '">' +
            '<input type="hidden" name="token" value="' + bookingEscape(authorized.token) + '">' +
            '<button type="submit" name="decision" value="approve">' + (final ? 'Retry notification if needed' : 'Confirm APPROVE entire schedule') + '</button>' +
            (final ? '' : ' <button type="submit" name="decision" value="reject">Confirm REJECT request</button>') + '</form>');
    } catch (error) { return bookingErrorPage(error); }
}

function doPost(e) {
    try {
        const action = e && e.parameter && e.parameter.decision;
        if (!['approve', 'reject'].includes(action)) throw new Error('Invalid decision.');
        const result = withBookingLock(() => {
            const authorized = authorizedBooking(e);
            try { return decideBooking(authorized, action); } catch (error) {
                writeBookingAdmin(authorized.store, authorized.rowNumber, { 'Booking Notes': error.message });
                throw error;
            }
        });
        return bookingPage('<h2>' + bookingEscape(result) + '</h2>');
    } catch (error) { return bookingErrorPage(error); }
}
