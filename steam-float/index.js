#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const FloatClient = require('csgo-float');
const config = require('./config');

let clientReady = false,
    roundDone = true;
let lastList, floatClient;

async function getItems() {
    roundDone = false;
    let url = `http://steamcommunity.com/market/listings/730/${config.itemHash}/render?start=0&count=20&currency=23&language=english`;
    try {
        let res = await axios.get(url);
        if (clientReady) {
            handleList(res.data, lastList);
        } else {
            let waitClient = setInterval(() => {
                if (clientReady) {
                    clearInterval(waitClient);
                    handleList(res.data, lastList);
                }
            }, 1000);
        }
    } catch (e) {
        console.log(e);
        roundDone = true;
    }
};

setInterval(() => {
    console.log(`${new Date()},开始新一轮scan`);
    if (roundDone) {
        getItems();
    }
}, 2000);


function handleList(newList, lastList) {
    console.log(`${new Date()},拿到新的列表，共有${newList.total_count}个物品。`);
    let newItems = getNewItems(newList.listinginfo, lastList);
    lastList = newList.listinginfo;
    if (newItems.length) {
        let getFloatPromise = floatClient.requestFloat(getFloatQueryString(getInGameUrl(newItems[0])));
        if (newItems.length === 1) {
            let price = getPrice(newItems[0]);
            getFloatPromise.then((float) => {
                handleItem(price, float);
                roundDone = true;
            })
        } else {
            for (let i = 1; i < newItems.length; i++) {
                (function() {
                    let thisItem = newItems[i];
                    let price = getPrice(thisItem);
                    let newGetFloat = () => floatClient.requestFloat(getFloatQueryString(getInGameUrl(thisItem)));
                    getFloatPromise = getFloatPromise.then(float => {
                        handleItem(price, float);
                        if (i === newItems.length - 1) {
                            roundDone = true;
                        } else {
                            return newGetFloat();
                        }
                    });
                })(i)
            }
        }
    } else {
        console.log('没有新物品！');
        roundDone = true;
    }

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
    let newListIds = Object.keys(newList);
    let oldListIds = oldList ? Object.keys(oldList) : [];
    // for first time, no new item, return empty
    return !oldList ? [] : newListIds.filter((id) => {
        return !oldListIds.includes(id);
    });
}

function getInGameUrl(itemInfo) {
    let linkTemplate = itemInfo.asset.market_actions[0].link;
    let assetId = itemInfo.asset.id;
    return linkTemplate.replace('%listingid%', itemInfo.listingid).replace('%assetid%', assetId);
}

function getFloatQueryString(inGameUrl) {
    let prefix = 'csgo_econ_action_preview%20';
    let index = inGameUrl.indexOf(prefix);
    return inGameUrl.substring(index + prefix.length);
}

function getPrice(itemInfo) {
    return (itemInfo.converted_price + itemInfo.converted_fee) / 100;
}


~ function initClient() {
    floatClient = new FloatClient({
        account_name: config.username,
        password: config.pass || process.env.CSGO_PW,
        sha_sentryfile: fs.readFileSync('access.sentry'),
        // auth_code: 'V53CJ'
    }, false);

    floatClient
        .on('ready', () => {
            // client.requestFloat(floatQueryString).then(floatValue => console.log('Skin float value:', floatValue))
            clientReady = true;
        })
        .on('sentry', data => {
            console.log('sentry', data)
            fs.writeFileSync('access.sentry', data)
        })
        .on('error', err => console.log(err))
}()


// getItems();