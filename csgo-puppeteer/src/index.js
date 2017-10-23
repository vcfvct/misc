#!/usr/bin/env node

const puppeteer = require('puppeteer');
const config = require('./config');
const play = require('./sound');
// const sendmail = require('sendmail')({silent: true});
const EmailService = require('./email');
// 用sohu发送
const emailService1 = new EmailService('sohu');
const emailService2 = new EmailService('163');
const Utils = require('./utils');
const ItemService = require('./item');
const itemService = new ItemService();
const cookies = config.cookies;

let lastList;
const targetUrl = `https://steamcommunity.com/market/listings/730/${config.itemHash}`;
let cookieCount = 0;
let errorCount = 0;

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
        run(browser, page);
    } catch (e) {
        console.log(e);
    }
    // browser.close();
})();

async function run(browser, page) {
    try {
        await page.deleteCookie(...cookies[cookieCount++ % cookies.length]);
        await page.setCookie(...cookies[cookieCount % cookies.length]);
        await page.goto(targetUrl);
        await extractPage(browser, page);
    } catch (e) {
        console.log(e);
    }
    // schedule下一个扫描
    setTimeout(() => run(browser, page),
        Utils.randomIntFromInterval(config.interval.min, config.interval.max) * 1000
    );
}

async function extractPage(browser, page) {
    const listInfos = await page.evaluate(() => window.g_rgListingInfo);
    if (!listInfos) {
        console.log('没有获得物品列表！');
        if (++errorCount >= config.errorCountThreshold) {
            errorCount = 0;
            play(config.errorSoundFilePath);
        }
        return;
    }
    errorCount = 0;
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
