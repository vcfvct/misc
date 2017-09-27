#!/usr/bin/env node

const puppeteer = require('puppeteer');
const config = require('./config');
// const sendmail = require('sendmail')({silent: true});
const EmailService = require('./email');
// 用sohu发送
const emailService = new EmailService('sohu');
const play = require('./sound');

let lastList;
const targetUrl = `https://steamcommunity.com/market/listings/730/${config.itemHash}`;

(async () => {
    const browser = await puppeteer.launch({ headless: false, delay: 1000 });
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
    // 3秒到10秒随机
    setTimeout(() => run(browser, page), 3 + Math.random() * 7000);
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
    const newItems = getNewItems(listInfos, lastList);
    lastList = listInfos;
    let msg = '';
    for (let item of newItems) {
        const floatInfo = await getFloat(browser, item);
        msg += `${new Date()} -- 磨损值： ${floatInfo}, and 价格 : ${getPrice(item)} \n<br/>`;
    }
    if (newItems.length) {
        play(config.soundFilePath);
        msg += `...点击<a href="${targetUrl}" target="_blank">这里前往</a><br/>`
        // let's notify user
        emailService.sendEmail('有新物品了！', msg);
    }
}

async function getFloat(browser, itemInfo) {
    const floatPage = await browser.newPage();
    const queryUrl = getQueryUrl(itemInfo);
    await floatPage.goto(queryUrl);

    const floatHolder = await floatPage.evaluate(() => {
        const preTag = document.querySelector('pre');
        return JSON.parse(preTag.innerHTML);
    });
    await floatPage.close();
    return floatHolder.iteminfo.floatvalue;
}

function getQueryUrl(itemInfo) {
    const linkTemplate = itemInfo.asset.market_actions[0].link;
    const indexOfD = linkTemplate.lastIndexOf('D');
    const paramD = linkTemplate.substring(indexOfD + 1);
    const paramA = itemInfo.asset.id;
    const paramM = itemInfo.listingid;
    return `https://api.csgofloat.com:1738/?m=${paramM}&a=${paramA}&d=${paramD}`;
}

function getPrice(itemInfo) {
    return (itemInfo.converted_price + itemInfo.converted_fee) / 100;
}

function getNewItems(newList, oldList) {
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