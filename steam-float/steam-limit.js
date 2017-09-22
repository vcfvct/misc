#!/usr/bin/env node

const axios = require('axios');

let itemHash = '%E2%98%85%20Specialist%20Gloves%20%7C%20Foundation%20%28Field-Tested%29';

let url = `http://steamcommunity.com/market/listings/730/${itemHash}/render?start=0&count=20&currency=23&language=english`;

setInterval(() => {
    //console.log('calling...');
    axios.get(url).then((res) => { console.log(res.data.success) });
}, 2000);