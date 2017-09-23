#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const FloatClient = require('csgo-float');
const config = require('./config');

let clientReady = false,
    roundDone = true;
let lastList;
let args = process.argv.slice(2);
let debug = args[0];


async function getItems() {
    roundDone = false;
    let url = `http://steamcommunity.com/market/listings/730/${config.itemHash}/render?start=0&count=20&currency=23&language=english`;
    try {
        let res = await axios.get(url);
        handleList(res.data, lastList);

    } catch (e) {
        console.log(e);
        roundDone = true;
    }
};


async function handleNewItem(itemInfo) {
    let queryUrl = getQueryUrl(item);
    let floatRes = await axios.get(queryUrl);
    console.log(floatRes.data);
    console.log(getPrice(itemInfo));
}


function handleList(newList, lastList) {
    if (debug) {
        console.log(`${new Date()},拿到新的列表，共有${newList.total_count}个物品。`);
    }
    let newItems = getNewItems(newList.listinginfo, lastList);
    // let newItems = newList.listinginfo;
    lastList = newList.listinginfo;

    // axios.get(getQueryUrl(Object.values(newItems)[0])).then((float) => console.log(float.data));
    newLists = Object.values(newItems);
    let promises = newLists.map((item) => {
        let queryUrl = getQueryUrl(item);
        console.log(queryUrl);
        return axios.get(queryUrl);
    });

    Promise.all(promises)
        .then((floats) => {
            roundDone = true;
            floats.forEach((floatObj, index) => {
                let price = getPrice(newLists[index]);
                let float = floatObj.data.iteminfo.floatvalue;
                handleItem(price, float);
            });
        })
        .catch((err) => {
            roundDone = true;
            console.err(err);
        });

}

function handleItem(price, float) {
    if (isGoodItem(price, float)) {
        console.log(`好东西：磨损：${float}, 价格：¥${price}.`);
    } else {
        console.log(`忽略新物品, 磨损：${float}, 价格：¥${price}.`);
    }
}

function isGoodItem(price, float) {
    return price < 2000 && float < 0.3;
}

function getNewItems(newList, oldList) {
    let result = [];
    let newListIds = Object.keys(newList);
    if (oldList) {
        let oldListIds = Object.keys(oldList);
        oldListIds.forEach((oldId) => {
            if (!newList[oldId]) {
                result.push(newList[oldId]);
            }
        });
    }
    return result;
}

function getQueryUrl(itemInfo) {
    let linkTemplate = itemInfo.asset.market_actions[0].link;
    let indexOfD = linkTemplate.lastIndexOf('D');
    let paramD = linkTemplate.substring(indexOfD + 1);
    let paramA = itemInfo.asset.id;
    let paramM = itemInfo.listingid;
    return `https://api.csgofloat.com:1738/?m=${paramM}&a=${paramA}&d=${paramD}`;
}


function getPrice(itemInfo) {
    return (itemInfo.converted_price + itemInfo.converted_fee) / 100;
}


setInterval(() => {
    if (roundDone) {
        console.log(`${new Date()},开始新一轮scan`);
        getItems();
    }
}, 5000);

// getItems();