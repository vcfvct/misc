#!/usr/bin/env node

const puppeteer = require('puppeteer');
const config = require('./config');
const EmailService = require('./email');
// 用到的通知邮件
const emailService1 = new EmailService('sohu');
const emailService2 = new EmailService('163');
const Utils = require('./utils');
const cookies = config.cookies;

let lastList;
// 搜索链接
const targetUrl = `https://steamcommunity.com/market/search?q=&category_730_ItemSet%5B%5D=any&category_730_ProPlayer%5B%5D=any&category_730_StickerCapsule%5B%5D=any&category_730_TournamentTeam%5B%5D=any&category_730_Weapon%5B%5D=any&category_730_Exterior%5B%5D=tag_WearCategory0&category_730_Type%5B%5D=tag_Type_Hands&appid=730`;
let cookieCount = 0;

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
    const listEls = await page.$$('.market_listing_row_link');
    const itemList = [];
    for (let target of listEls) {
        const item = await page.evaluate((el) => {
            const name = el.querySelector('.market_listing_item_name').innerHTML;
            const count = parseInt(el.querySelector('.market_listing_num_listings_qty').innerHTML);
            const link = el.href.replace(/(http|https):\/\//, '');
            return { name, count, link };
        }, target);
        // console.log(item);
        itemList.push(item);
    };
    console.log(itemList.map(item => getItemMsg(item, false)).join());
    const increatedItems = getIncreasedItems(itemList, lastList);
    lastList = itemList;
    if (increatedItems.length) {
        const itemMsgs = increatedItems.map(item => getItemMsg(item, true));
        const msg = itemMsgs.join();
        Utils.notify(config.soundFilePath, config.emailSubject, msg, emailService1, emailService2);
    }
}

function getIncreasedItems(newList, oldList) {
    const result = [];
    if (oldList) {
        console.log(`new list: ${JSON.stringify(newList)}, old list: ${JSON.stringify(oldList)}`);
        newList.forEach((item) => {
            const matchedItem = oldList.find(o => item.link === o.link);
            if (matchedItem) {
                if (matchedItem.count > item.count) {
                    result.push(item);
                }
            } else {
                console.log(`new item: ${JSON.stringify(item)}`);
                result.push(item);
            }
        });
    }
    return result;
}

function getItemMsg(item, includeLink) {
    let msg = `名称: ${item.name}, 数量: ${item.count}`;
    includeLink && (msg += `, 链接: <a href="${item.link}">点击这里</a> \n<br/>`);
    return msg;
}
