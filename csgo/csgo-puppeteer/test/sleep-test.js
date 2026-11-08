#!/usr/bin/env node

const Utils = require('../src/utils');

(async function () {
    console.log(new Date().toLocaleString());
    await Utils.sleep(3000);
    console.log(new Date().toLocaleString());
})();