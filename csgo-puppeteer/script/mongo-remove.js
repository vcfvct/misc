#!/usr/bin/env node

const utils = require('../src/utils');

(async () => {
    const db = await utils.getMongoDB();
    const csgo = db.collection('csgo');
    const item = {
        link: 'https://steamcommunity.com/market/listings/730/%E2%98%85%20M9%20Bayonet'
    };
    const result = await csgo.remove(item);
    console.log(result);
    db.close();
})();
