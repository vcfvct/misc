// Standalone Google Apps Script. Run createRecurringBookingForm() once.
// Creates a NEW unpublished test form and response spreadsheet, not an approval workflow.
const BOOKING_FORM_CONFIG = Object.freeze({
    title: '[TEST] CCCG教会地产使用申请登记表 / Facility Booking',
    timezone: 'America/New_York',
    setupKey: 'CCCG_RECURRING_FORM_SETUP_V1'
});

/**
 * Re-running after success prints the existing links without creating duplicates.
 * A failed/partial setup is deliberately not retried automatically.
 */
function createRecurringBookingForm() {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
        const properties = PropertiesService.getScriptProperties();
        const saved = properties.getProperty(BOOKING_FORM_CONFIG.setupKey);
        if (saved) {
            const state = JSON.parse(saved);
            logBookingFormLinks(state);
            if (state.status !== 'complete') {
                throw new Error('A partial setup already exists. See the logged links and README recovery instructions.');
            }
            return state;
        }

        const state = { status: 'building' };
        properties.setProperty(BOOKING_FORM_CONFIG.setupKey, JSON.stringify(state));

        // Keep the draft unpublished until its owner reviews responder permissions.
        const form = FormApp.create(BOOKING_FORM_CONFIG.title, false);
        state.formId = form.getId();
        state.editUrl = form.getEditUrl();
        state.responderUrl = form.getPublishedUrl();
        properties.setProperty(BOOKING_FORM_CONFIG.setupKey, JSON.stringify(state));
        logBookingFormLinks(state);

        form.setDescription([
            '测试表单：不会自动发送审批邮件或创建日历活动。',
            'TEST FORM: no approval emails or calendar events are created.',
            '所有日期及时间使用 America/New_York（美国东部时间，含夏令时）。',
            'All dates and times use America/New_York (Eastern Time, including daylight saving).',
            '开始和结束日期时间描述第一次活动，不是整个重复系列。',
            'Start/end dates and times describe the FIRST occurrence, not the whole series.'
        ].join('\n'));
        // Use an explicit, unverified email question rather than Google-account collection.
        form.setCollectEmail(false);
        form.setLimitOneResponsePerUser(false);
        form.setShuffleQuestions(false);
        form.setProgressBar(true);
        form.setPublishingSummary(false);
        form.setAllowResponseEdits(false);
        form.setConfirmationMessage('测试申请已记录，尚未获得批准。Test request recorded; this is not an approved reservation.');

        addBookingQuestions(form);

        const spreadsheet = SpreadsheetApp.create(BOOKING_FORM_CONFIG.title + ' — Responses');
        state.spreadsheetId = spreadsheet.getId();
        state.spreadsheetUrl = spreadsheet.getUrl();
        properties.setProperty(BOOKING_FORM_CONFIG.setupKey, JSON.stringify(state));
        spreadsheet.setSpreadsheetTimeZone(BOOKING_FORM_CONFIG.timezone);
        spreadsheet.setSpreadsheetLocale('en_US');
        form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());

        state.status = 'complete';
        properties.setProperty(BOOKING_FORM_CONFIG.setupKey, JSON.stringify(state));
        logBookingFormLinks(state);
        return state;
    } catch (error) {
        console.error('Form setup failed: ' + error.message);
        throw error;
    } finally {
        lock.releaseLock();
    }
}

function addBookingQuestions(form) {
    form.addTextItem()
        .setTitle('Email Address')
        .setHelpText('联系邮箱。无需 Google 登录；请确认拼写正确。Contact email; no Google sign-in verification.')
        .setRequired(true)
        .setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
    form.addTextItem().setTitle('Event Title').setHelpText('活动名称').setRequired(true);
    form.addTextItem().setTitle('Applicant Name').setHelpText('申请人姓名').setRequired(true);
    form.addDateItem().setTitle('Start Date').setIncludesYear(true)
        .setHelpText('第一次活动的开始日期 / First occurrence start date').setRequired(true);
    form.addTimeItem().setTitle('Start Time')
        .setHelpText('开始时间 / Start time — America/New_York').setRequired(true);
    form.addDateItem().setTitle('End Date').setIncludesYear(true)
        .setHelpText('第一次活动的结束日期；可跨夜 / First occurrence end date; overnight allowed').setRequired(true);
    form.addTimeItem().setTitle('End Time')
        .setHelpText('结束时间 / End time — America/New_York').setRequired(true);
    // Single choice intentionally replaces the original participant-count checkboxes.
    form.addMultipleChoiceItem().setTitle('参与人数')
        .setHelpText('Number of participants — select one')
        .setChoiceValues(['<10', '10 - 50', '50-100', '>100']).setRequired(true);
    form.addCheckboxItem().setTitle('申请使用区域')
        .setHelpText('Requested areas — select all that apply')
        .setChoiceValues(['团契厅', '办公楼会议室', '办公楼厨房餐厅', '办公楼二楼']).setRequired(true);
    form.addParagraphTextItem().setTitle('活动介绍')
        .setHelpText('Activity description / special requirements').setRequired(false);
    const repeatType = form.addMultipleChoiceItem().setTitle('Repeat Type')
        .setHelpText('重复频率：不重复 / 每周 / 每月。选择后点击“下一步”。Choose a schedule, then click Next.')
        .setRequired(true);

    const weekly = form.addPageBreakItem().setTitle('Weekly settings / 每周设置');
    form.addListItem().setTitle('Repeat Every — Weeks')
        .setHelpText('每几周重复一次？1 = 每周，2 = 每两周 / Interval in weeks')
        .setChoiceValues(['1', '2', '3', '4']).setRequired(true);
    form.addCheckboxItem().setTitle('Repeat On — Weekdays')
        .setHelpText('星期一至星期日。首次日期须符合所选星期；所有场次使用相同时间和区域。First date must match; same times and rooms for every occurrence.')
        .setChoiceValues(bookingWeekdays()).setRequired(true);

    const monthly = form.addPageBreakItem().setTitle('Monthly settings / 每月设置');
    form.addListItem().setTitle('Repeat Every — Months')
        .setHelpText('每几个月重复一次？ / Interval in months')
        .setChoiceValues(['1', '2', '3', '6']).setRequired(true);
    const monthlyPattern = form.addMultipleChoiceItem().setTitle('Monthly Pattern')
        .setHelpText('按日期（例如15日）或星期位置（例如第二个星期日）。By calendar date or weekday position.')
        .setRequired(true);

    const monthlyDate = form.addPageBreakItem().setTitle('Monthly date / 每月几号');
    form.addListItem().setTitle('Monthly Day')
        .setHelpText('首次日期须符合此规则。没有该日期的月份跳过，例如每月31日跳过二月。First date must match; months without this day are skipped.')
        .setChoiceValues(Array.from({ length: 31 }, (_, index) => String(index + 1))).setRequired(true);

    const monthlyWeekday = form.addPageBreakItem().setTitle('Monthly weekday / 每月第几个星期几');
    form.addListItem().setTitle('Monthly Week Position')
        .setHelpText('第一个 / 第二个 / 第三个 / 第四个 / 最后一个；首次日期须符合此规则。First occurrence date must match this rule.')
        .setChoiceValues(['First', 'Second', 'Third', 'Fourth', 'Last']).setRequired(true);
    form.addListItem().setTitle('Monthly Weekday')
        .setHelpText('星期一至星期日 / Day of week')
        .setChoiceValues(bookingWeekdays()).setRequired(true);

    const ending = form.addPageBreakItem().setTitle('Repeat ending / 重复结束');
    form.addDateItem().setTitle('Repeat Until').setIncludesYear(true)
        .setHelpText('最后允许开始一场活动的日期（含当天）。拟定上限为首次活动后12个月；测试表单尚不校验。Inclusive last occurrence start date. Proposed limit: 12 months from first occurrence; not yet validated.')
        .setRequired(true);

    const finalSection = form.addPageBreakItem().setTitle('Acknowledgment / 确认');
    form.addCheckboxItem().setTitle('Acknowledgment')
        .setHelpText('申请不是预订确认。重复申请的审批涵盖整个系列。测试阶段不会发送审批邮件。A request is not a confirmed reservation; series approval covers the full schedule. No approval emails during testing.')
        .setChoiceValues(['I understand / 我已了解']).setRequired(true);

    repeatType.setChoices([
        repeatType.createChoice('Does not repeat', finalSection),
        repeatType.createChoice('Weekly', weekly),
        repeatType.createChoice('Monthly', monthly)
    ]);
    monthlyPattern.setChoices([
        monthlyPattern.createChoice('Day of month', monthlyDate),
        monthlyPattern.createChoice('Weekday of month', monthlyWeekday)
    ]);

    // IMPORTANT: PageBreakItem.setGoToPage controls the section BEFORE that break.
    // Choice-based routing overrides that section's default navigation.
    monthly.setGoToPage(ending); // Finish Weekly -> Repeat ending, skip Monthly.
    monthlyWeekday.setGoToPage(ending); // Finish Monthly date -> Repeat ending.
    // Monthly weekday -> Repeat ending -> Acknowledgment follow normal order.
    // The final section submits.
}

function bookingWeekdays() {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
}

function logBookingFormLinks(state) {
    console.log('Setup status: ' + state.status);
    if (state.editUrl) console.log('Form editor: ' + state.editUrl);
    if (state.responderUrl) console.log('Responder link (works after publishing/access review): ' + state.responderUrl);
    if (state.spreadsheetUrl) console.log('Response spreadsheet: ' + state.spreadsheetUrl);
    console.log('Keep the form as a draft until reviewed. Before publishing, set responder general access to Anyone with the link and test signed out.');
}
