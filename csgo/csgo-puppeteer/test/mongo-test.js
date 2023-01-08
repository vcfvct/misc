#!/usr/bin/env node

const mongoClient = require('mongodb').MongoClient;
const url = 'mongodb://csgo:csgo@ds137261.mlab.com:37261/hymn';

(async () => {
    const db = await mongoClient.connect(url);
    const hymnCol = db.collection('hymn');
    const count = await hymnCol.count();
    console.log(`count: ${count}`);
    db.close();
})();