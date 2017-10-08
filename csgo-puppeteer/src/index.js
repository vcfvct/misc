#!/usr/bin/env node

const puppeteer = require('puppeteer');
const config = require('./config');
// const sendmail = require('sendmail')({silent: true});
const EmailService = require('./email');
// 用sohu发送
const emailService1 = new EmailService('sohu');
const emailService2 = new EmailService('163');
const Utils = require('./utils');
const ItemService = require('./item');
const itemService = new ItemService();
const cookies = require('./cookie');

let lastList;
const targetUrl = `https://steamcommunity.com/market/listings/730/${config.itemHash}`;

(async () => {
    // const browser = await puppeteer.launch({ headless: false, delay: 1000 });
    const browser = await puppeteer.launch({ headless: true, args: ['--disable-timeouts-for-profiling'] });
    const page = await browser.newPage();
    const viewPort = {
        width: 1280,
        height: 800
    };
    page.setViewport(viewPort);

    try {
        await page.setCookie(...cookies);
        await page.goto(targetUrl);
        run(browser, page);
    } catch (e) {
        console.log(e);
    }
    // browser.close();
})();

async function run(browser, page) {
    try {
        await extractPage(browser, page);
    } catch (e) {
        console.log(e);
    }
    page.reload();
    // schedule下一个扫描
    setTimeout(() => run(browser, page),
        Utils.randomIntFromInterval(config.interval.min, config.interval.max) * 1000
    );
}

async function extractPage(browser, page) {
    const pageContent = await page.content();
    const g_rgListingInfo_index_string = 'var g_rgListingInfo = ';
    let g_rgListingInfo = pageContent.substring(pageContent.indexOf(g_rgListingInfo_index_string) + g_rgListingInfo_index_string.length, pageContent.indexOf('var g_plotPriceHistory ='));
    const lastIndexOfSemi = g_rgListingInfo.lastIndexOf(';');
    g_rgListingInfo = g_rgListingInfo.substring(0, lastIndexOfSemi);
    let listInfos = {};
    try {
        listInfos = JSON.parse(g_rgListingInfo);
    } catch (e) {
        console.log('没有得到完整json，返回！');
        return;
    }
    const totalCount = Object.keys(listInfos).length;
    if (lastList && Object.keys(lastList).length > 1 && totalCount === 0) {
        console.info(`上次总数是: ${Object.keys(lastList).length}, 本次总数是： ${totalCount}, 差距大，返回！`);
        return;
    }
    console.log(`${Utils.getLocaleDateTime()} -- 本轮scan物品数： ${totalCount}`);
    const newItems = Utils.calcNewItems(listInfos, lastList);
    lastList = listInfos;
    let msg = await Utils.getNotifyMsg(newItems, itemService, config.itemCriterias);
    if (msg) {
        Utils.notify(config.soundFilePath, targetUrl, config.emailSubject, msg, emailService1, emailService2);
    }
}
