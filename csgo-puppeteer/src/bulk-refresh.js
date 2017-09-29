#!/usr/bin/env node
const axios = require('axios');
const config = require('./config');
// const sendmail = require('sendmail')({silent: true});
const EmailService = require('./email');
const emailService1 = new EmailService('sohu');
const emailService2 = new EmailService('163');
const play = require('./sound');
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
    const newItems = calcNewItems(newList, lastList);
    lastList = newList;
    let msg = '';
    for (let item of newItems) {
        const floatInfo = await itemService.getFloat(item);
        msg += `${Utils.getLocaleDateTime()} -- 磨损值： ${floatInfo}, and 价格 : ${itemService.getPrice(item)} \n<br/>`;
    }
    if (newItems.length) {
        play(config.soundFilePath);
        msg += `...点击<a href="${targetUrl}" target="_blank">这里前往</a><br/>`
        // let's notify user
        emailService1.sendEmail(config.emailSubject, msg);
        emailService2.sendEmail(config.emailSubject, msg);
    }
}

async function getItemList() {
    let res = await axios.get(apiUrl);
    console.log(`${Utils.getLocaleDateTime()},拿到新的列表，共有${res.data.total_count}个物品。`);
    return res.data.listinginfo;
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