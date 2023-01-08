#!/usr/bin/env node

const cookies = require('../src/cookie');
const Utils = require('../src/utils');

const cookieStr = Utils.getCookieString(cookies);
console.log(cookieStr);