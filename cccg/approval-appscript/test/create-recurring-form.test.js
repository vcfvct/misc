// Offline checks with Apps Script mocks; no Google requests or form submissions.
// Run: node --test test/create-recurring-form.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'create-recurring-form.js'), 'utf8');

function harness({ failSpreadsheet = false } = {}) {
    const properties = new Map();
    const logs = [];
    const form = { items: [], settings: {} };
    const counters = { forms: 0, sheets: 0, releases: 0 };
    const spreadsheet = {
        getId: () => 'test-sheet',
        getUrl: () => 'https://example.test/sheet',
        setSpreadsheetTimeZone(value) { this.timezone = value; },
        setSpreadsheetLocale(value) { this.locale = value; }
    };
    for (const method of ['setDescription', 'setCollectEmail', 'setLimitOneResponsePerUser',
        'setShuffleQuestions', 'setProgressBar', 'setPublishingSummary',
        'setAllowResponseEdits', 'setConfirmationMessage']) {
        form[method] = (value) => { form.settings[method] = value; return form; };
    }
    for (const type of ['Text', 'Date', 'Time', 'MultipleChoice', 'Checkbox', 'ParagraphText', 'List', 'PageBreak']) {
        form['add' + type + 'Item'] = () => {
            const item = { type };
            for (const [method, field] of Object.entries({
                setTitle: 'title', setHelpText: 'help', setRequired: 'required',
                setIncludesYear: 'includesYear', setValidation: 'validation',
                setChoiceValues: 'values', setChoices: 'choices', setGoToPage: 'goTo'
            })) {
                item[method] = (value) => { item[field] = value; return item; };
            }
            item.createChoice = (value, destination) => ({ value, destination });
            form.items.push(item);
            return item;
        };
    }
    Object.assign(form, {
        getId: () => 'test-form',
        getEditUrl: () => 'https://example.test/edit',
        getPublishedUrl: () => 'https://example.test/respond',
        setDestination(type, id) { this.destination = { type, id }; }
    });
    const context = vm.createContext({
        console: { log: (message) => logs.push(message), error: (message) => logs.push(message) },
        LockService: { getScriptLock: () => ({
            waitLock: () => {}, releaseLock: () => { counters.releases++; }
        }) },
        PropertiesService: { getScriptProperties: () => ({
            getProperty: (key) => properties.get(key),
            setProperty: (key, value) => properties.set(key, value)
        }) },
        FormApp: {
            create: (title, published) => {
                counters.forms++;
                form.title = title;
                form.published = published;
                return form;
            },
            createTextValidation: () => ({
                requireTextIsEmail: () => ({ build: () => 'email-validation' })
            }),
            DestinationType: { SPREADSHEET: 'spreadsheet' }
        },
        SpreadsheetApp: { create: () => {
            counters.sheets++;
            if (failSpreadsheet) throw new Error('Simulated spreadsheet failure');
            return spreadsheet;
        } }
    });
    vm.runInContext(source, context);
    return { run: () => context.createRecurringBookingForm(), form, spreadsheet, counters, properties, logs };
}

// Model Google's documented rule: a page break's goTo affects the PRECEDING section.
function walkSections(form, answers) {
    const sections = [{ title: 'Request details', items: [] }];
    for (const item of form.items) {
        if (item.type === 'PageBreak') sections.push({ title: item.title, header: item, items: [] });
        else sections[sections.length - 1].items.push(item);
    }
    const visited = [];
    let index = 0;
    while (index < sections.length) {
        assert.ok(visited.length < 10, 'Routing must not loop');
        const section = sections[index];
        visited.push(section.title);
        const routingItem = section.items.find((item) => item.choices);
        const chosen = routingItem && routingItem.choices.find((choice) => choice.value === answers[routingItem.title]);
        if (routingItem) assert.ok(chosen, 'Missing routing answer for ' + routingItem.title);
        const nextHeader = sections[index + 1]?.header;
        const target = chosen?.destination || nextHeader?.goTo;
        index = target ? sections.findIndex((candidate) => candidate.header === target) : index + 1;
        assert.ok(index >= 0, 'Destination must exist');
    }
    return visited;
}

test('creates a draft with native dates/times, explicit email, unique headers and separate sheet', () => {
    const h = harness();
    const state = h.run();
    assert.equal(state.status, 'complete');
    assert.equal(h.form.published, false);
    assert.equal(h.form.settings.setCollectEmail, false);
    assert.equal(h.form.settings.setLimitOneResponsePerUser, false);
    assert.equal(h.form.settings.setPublishingSummary, false);
    assert.equal(h.spreadsheet.timezone, 'America/New_York');
    assert.equal(h.form.destination.id, 'test-sheet');
    const questions = h.form.items.filter((item) => item.type !== 'PageBreak');
    assert.equal(new Set(questions.map((item) => item.title)).size, questions.length);
    assert.equal(questions.find((item) => item.title === 'Email Address').validation, 'email-validation');
    assert.equal(questions.filter((item) => item.type === 'Date').length, 3);
    assert.ok(questions.filter((item) => item.type === 'Date').every((item) => item.includesYear));
    assert.equal(questions.filter((item) => item.type === 'Time').length, 2);
    assert.equal(questions.find((item) => item.title === 'Monthly Day').values.length, 31);
    assert.equal(questions.find((item) => item.title === 'Repeat Until').required, true);
    assert.equal(h.counters.releases, 1);
});

test('all four paths skip irrelevant required sections and finish at acknowledgment', () => {
    const h = harness();
    h.run();
    const final = 'Acknowledgment / 确认';
    const ending = 'Repeat ending / 重复结束';
    assert.deepEqual(walkSections(h.form, { 'Repeat Type': 'Does not repeat' }), ['Request details', final]);
    assert.deepEqual(walkSections(h.form, { 'Repeat Type': 'Weekly' }), [
        'Request details', 'Weekly settings / 每周设置', ending, final
    ]);
    for (const [pattern, section] of [
        ['Day of month', 'Monthly date / 每月几号'],
        ['Weekday of month', 'Monthly weekday / 每月第几个星期几']
    ]) {
        assert.deepEqual(walkSections(h.form, { 'Repeat Type': 'Monthly', 'Monthly Pattern': pattern }), [
            'Request details', 'Monthly settings / 每月设置', section, ending, final
        ]);
    }
});

test('rerun returns saved links without duplicate resources', () => {
    const h = harness();
    const first = h.run();
    const second = h.run();
    assert.equal(first.formId, second.formId);
    assert.equal(h.counters.forms, 1);
    assert.equal(h.counters.sheets, 1);
    assert.equal(h.counters.releases, 2);
});

test('partial failure retains recovery links and blocks automatic duplication', () => {
    const h = harness({ failSpreadsheet: true });
    assert.throws(h.run, /Simulated spreadsheet failure/);
    const state = JSON.parse([...h.properties.values()][0]);
    assert.equal(state.status, 'building');
    assert.equal(state.formId, 'test-form');
    assert.throws(h.run, /partial setup already exists/);
    assert.equal(h.counters.forms, 1);
    assert.equal(h.counters.releases, 2);
});
