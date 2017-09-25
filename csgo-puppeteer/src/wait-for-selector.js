#!/usr/bin/env node

const puppeteer = require('puppeteer');

puppeteer.launch({
    headless: false,
    slowMo: 2000 // slow down by 250ms
}).then(async browser => {
    const page = await browser.newPage();
    let currentURL;
    page
        .waitForSelector('img')
        .then(() => console.log('First URL with image: ' + currentURL));
    for (currentURL of ['https://example.com', 'https://google.com', 'https://bbc.com'])
        await page.goto(currentURL);
    await browser.close();
});