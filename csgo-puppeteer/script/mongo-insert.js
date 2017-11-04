#!/usr/bin/env node

const utils = require('../src/utils');

(async () => {
    const db = await utils.getMongoDB();
    const csgo = db.collection('csgo');
    const item = {
        name: `好东西${getRandomInt()}`,
        count: getRandomInt(),
        link: 'https://steamcommunity.com/market/listings/730/%E2%98%85%20M9%20Bayonet'
    };
    const result = await csgo.insert(item);
    console.log(result);
    db.close();
})();

function getRandomInt() {
    return Math.floor(Math.random() * 10 + 1);
}
