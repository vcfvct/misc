#!/usr/bin/env node
const puppeteer = require('puppeteer');
const url = 'https://steamcommunity.com/market/listings/730/%E2%98%85%20M9%20Bayonet';
(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--disable-timeouts-for-profiling'] });
    const page = await browser.newPage();
    await page.goto(url);
    const totalCountEl = await page.$('#searchResults_total');
    const count = await page.evaluate(el => el.innerHTML, totalCountEl);
    const count1 = await page.$eval('#searchResults_total', el => el.innerHTML);
    console.log(`From 'page.evaluate' ${count}, From 'page.$eval' ${count1}`);
    browser.close();
})();