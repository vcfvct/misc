#!/usr/bin/env node

const puppeteer = require('puppeteer');
const config = require('./config');
const EmailService = require('./email');
// 用到的通知邮件
const emailService1 = new EmailService('sohu');
const emailService2 = new EmailService('163');
const Utils = require('./utils');
const play = require('./sound');
const cookies = config.cookies;

let lastList;
// 搜索链接
const targetUrl = `https://steamcommunity.com/market/search?q=&category_730_ItemSet%5B%5D=any&category_730_ProPlayer%5B%5D=any&category_730_StickerCapsule%5B%5D=any&category_730_TournamentTeam%5B%5D=any&category_730_Weapon%5B%5D=any&category_730_Exterior%5B%5D=tag_WearCategory0&category_730_Type%5B%5D=tag_Type_Hands&appid=730`;
let cookieCount = 0;
let errorCount = 0;
// 如果物品名称包含任何关键字,就不会被比较和提示.
const excludeKeywords = ['菱背蛇纹', '风之力-九头蛇弓'];

let browser, mainPage;

(async () => {
    browser = await puppeteer.launch({ headless: false, delay: 1000 });
    // const browser = await puppeteer.launch({ headless: true, args: ['--disable-timeouts-for-profiling'] });
    mainPage = await browser.newPage();
    const viewPort = {
        width: 1280,
        height: 800
    };
    mainPage.setViewport(viewPort);

    try {
        run();
    } catch (e) {
        console.log(e);
    }
})();

async function run() {
    try {
        await mainPage.deleteCookie(...cookies[cookieCount++ % cookies.length]);
        await mainPage.setCookie(...cookies[cookieCount % cookies.length]);
        await mainPage.goto(targetUrl);
        await extractPage();
    } catch (e) {
        console.log(e);
    }
    // schedule下一个扫描
    setTimeout(() => run(),
        Utils.randomIntFromInterval(config.interval.min, config.interval.max) * 1000
    );
}

async function extractPage() {
    const listEls = await mainPage.$$('.market_listing_row_link');
    if (!listEls || !listEls.length) {
        console.log('没有获得物品列表！');
        if (++errorCount >= config.errorCountThreshold) {
            errorCount = 0;
            play(config.errorSoundFilePath);
        }
        return;
    }

    const itemList = [];
    for (let target of listEls) {
        const item = await mainPage.evaluate((el) => {
            const name = el.querySelector('.market_listing_item_name').innerHTML;
            const count = parseInt(el.querySelector('.market_listing_num_listings_qty').innerHTML.replace(',', ''));
            const link = el.href.replace(/(http|https):\/\//, '');
            return { name, count, link };
        }, target);
        isEligibleItem(item) && itemList.push(item);
    };
    console.log(Utils.getLocaleDateTime());
    console.log(itemList.map(item => getItemMsg(item, false)).join('\n'));
    const increasedItems = getIncreasedItems(itemList, lastList);
    lastList = itemList;
    if (increasedItems.length) {
        const itemMsgs = increasedItems.map(item => getItemMsg(item, true));
        const msg = `发现时间: ${Utils.getLocaleDateTime()} \n<br/> ${itemMsgs.join('\n<br/>')}`;
        Utils.notify(config.soundFilePath, config.emailSubject, msg, emailService1, emailService2);

        let count = 5;
        for (let item of increasedItems) {
            let lastList;
            const itemPage = await browser.newPage();
            let targetUrl = `https://${item.link}`;
            for (let i = 0; i < count; i++) {
                await itemPage.goto(targetUrl);
                const totalCountEl = await itemPage.$('#searchResults_total');
                const itemCount = await itemPage.evaluate(el => el.innerHTML, totalCountEl);
                const listInfos = await itemPage.evaluate(() => window.g_rgListingInfo);
                if (!listInfos) {
                    console.log('没有获得物品列表！');
                } else {
                    if (itemCount >= item.count) {
                        const newItems = Utils.calcNewItems(listInfos, lastList);
                        let msg = await Utils.getNotifyMsg(newItems, config.itemCriterias);
                        if (msg) {
                            msg += `Steam购买地址：<a href="${targetUrl}" target="_blank">这里前往</a><br/>`;
                            msg += config.emailContentSuffix();
                            Utils.notify(config.soundFilePath, config.emailSubject, msg, emailService1, emailService2);
                        }
                        break;
                    }
                    lastList = listInfos;
                    await Utils.sleep(1000);
                }
            }
            itemPage.close();
        }
        // TODO inseat record to mongo so that the scan machine could pick up. 
        // const mongo = Utils.getMongoDB().collection('csgo');
        // for (let item of increasedItems) {
        //     await mongo.insert(item);
        // }
    }
}

function getIncreasedItems(newList, oldList) {
    const result = [];
    if (oldList) {
        newList.forEach((item) => {
            const matchedItem = oldList.find(o => item.link === o.link);
            if (matchedItem) {
                if (matchedItem.count < item.count) {
                    result.push(item);
                }
            } else {
                console.log(`新物品: ${JSON.stringify(item)}`);
                result.push(item);
            }
        });
    }
    return result;
}

function getItemMsg(item, includeLink) {
    let msg = `名称: ${item.name}, 数量: ${item.count}`;
    includeLink && (msg += `, 链接: <a href="https://${item.link}" target="_blank">点击这里</a>`);
    return msg;
}

function isEligibleItem(item) {
    let rs = true;
    for (let keyword of excludeKeywords) {
        if (item.name.includes(keyword)) {
            rs = false;
            break;
        }
    }
    return rs;
}