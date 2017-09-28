#!/usr/bin/env node

const puppeteer = require('puppeteer');
const config = require('./config');
// const sendmail = require('sendmail')({silent: true});
const EmailService = require('./email');
// 用sohu发送
const emailService1 = new EmailService('sohu');
const emailService2 = new EmailService('163');
const play = require('./sound');
const Utils = require('./utils');
const ItemService = require('./item');
const itemService = new ItemService();

let lastList;
const targetUrl = `https://steamcommunity.com/market/listings/730/${config.itemHash}`;

(async () => {
    // const browser = await puppeteer.launch({ headless: false, delay: 1000 });
    const browser = await puppeteer.launch({ headless: true, args: ['--disable-timeouts-for-profiling']  });
    const page = await browser.newPage();
    const viewPort = {
        width: 1280,
        height: 800,
    };
    page.setViewport(viewPort);

    try {
        await page.setCookie(...config.cookies);
        await page.goto(targetUrl);
        // await page.waitForSelector('.market_paging_summary');
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
    // 10秒到15秒随机
    setTimeout(() => run(browser, page),  utils.randomIntFromInterval(10, 15)*1000);
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
    console.log(`${new Date()} -- 本轮scan物品数： ${Object.keys(listInfos).length}`);
    const newItems = calcNewItems(listInfos, lastList);
    lastList = listInfos;
    let msg = '';
    for (let item of newItems) {
        const floatInfo = await itemService.getFloat(item);
        msg += `${new Date()} -- 磨损值： ${floatInfo}, and 价格 : ${itemService.getPrice(item)} \n<br/>`;
    }
    if (newItems.length) {
        play(config.soundFilePath);
        msg += `...点击<a href="${targetUrl}" target="_blank">这里前往</a><br/>`
        // let's notify user
        emailService2.sendEmail('有新物品了！', msg);
        emailService1.sendEmail('有新物品了！', msg);
    }
}


function calcNewItems(newList, oldList) {
    const result = [];
    const newListIds = Object.keys(newList);
    if (oldList) {
        const newListIds = Object.keys(newList);
        newListIds.forEach((oldId) => {
            if (!oldList[oldId]) {
                result.push(newList[oldId]);
            }
        });
    }
    return result;
}