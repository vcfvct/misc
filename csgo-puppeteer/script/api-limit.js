#!/usr/bin/env node

const axios = require('axios');
const itemHash = 'M4A1-S%20%7C%20Hot%20Rod%20%28Factory%20New%29';
const getApiUrl = (start, end) => `http://steamcommunity.com/market/listings/730/${itemHash}/render?start=${start}&count=${end}&currency=23&language=english`;

~async function run() {
    const res = await axios.get(getApiUrl(100, 100));
    const listings = res.data.listinginfo;
    console.log(Object.keys(listings).length);
}();
