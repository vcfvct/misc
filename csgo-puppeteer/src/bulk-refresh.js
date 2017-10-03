#!/usr/bin/env node
const axios = require('axios');
const config = require('./config');
// const sendmail = require('sendmail')({silent: true});
const EmailService = require('./email');
const emailService1 = new EmailService('sohu');
const emailService2 = new EmailService('163');
const Utils = require('./utils');
const ItemService = require('./item');
const itemService = new ItemService();
let lastList = {};
const apiUrl = `http://steamcommunity.com/market/listings/730/${config.itemHash}/render?start=0&count=100&currency=23&language=english`;
const targetUrl = `https://steamcommunity.com/market/listings/730/${config.itemHash}`;
(async () => {
    try {
        lastList = await getItemList();
        run();
    } catch (e) {
        console.log(e);
    }
})();

async function run() {
    try {
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
    const newList = await getItemList();
    const newItems = Utils.calcNewItems(newList, lastList);
    lastList = newList;
    let msg = await Utils.getNotifyMsg(newItems, itemService, config.itemCriterias);
    if (msg) {
        Utils.notify(config.soundFilePath, targetUrl, config.emailSubject, msg, emailService1, emailService2);
    }
}

async function getItemList() {
    let res = await axios.get(apiUrl);
    console.log(`${Utils.getLocaleDateTime()},拿到新的列表，共有${res.data.total_count}个物品。`);
    return res.data.listinginfo;
}