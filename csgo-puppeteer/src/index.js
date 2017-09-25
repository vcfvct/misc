#!/usr/bin/env node

const puppeteer = require('puppeteer');
const config = require('./config');

let lastList;

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
        await page.goto(`https://steamcommunity.com/market/listings/730/${config.itemHash}`);
        await page.waitForSelector('.market_paging_summary');
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
    setTimeout(() => run(browser, page), Math.random() * 8000);
}

async function extractPage(browser, page) {
    const pageContent = await page.content();
    const g_rgListingInfo_index_string = 'var g_rgListingInfo = ';
    let g_rgListingInfo = pageContent.substring(pageContent.indexOf(g_rgListingInfo_index_string) + g_rgListingInfo_index_string.length, pageContent.indexOf('var g_plotPriceHistory ='));
    const lastIndexOfSemi = g_rgListingInfo.lastIndexOf(';');
    g_rgListingInfo = g_rgListingInfo.substring(0, lastIndexOfSemi);
    const listInfos = JSON.parse(g_rgListingInfo);
    console.log(`${new Date()} -- 本轮scan物品数： ${Object.keys(listInfos).length}`);
    const newItems = getNewItems(listInfos, lastList);
    lastList = listInfos;
    for (let item of newItems) {
        const floatInfo = await getFloat(browser, item);
        console.log(`${new Date()} -- floatvalue is ${floatInfo}, and price is: ${getPrice(item)}`);
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

async function login(page) {
    await page.click('a.global_action_link');
    await page.waitForSelector('input#steamAccountName');
    await page.focus('#steamAccountName');
    await page.type('MYACC');
    await page.focus('#steamPassword');
    await page.type('MYPW');
    return await page.click('input[type="submit"]');
}