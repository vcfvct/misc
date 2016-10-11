#!/usr/bin/env node

var fs = require('fs');
let rs = [];
fs.readFile('wedding.txt', function(err, data) {
    if (err) throw err;
    var rows = data.toString().split("\n");
    rows.forEach((row) => {
        let newRow = row.replace(/ {2,}/g, '');
        let cnPlusDigitReg = /[\u4E00-\u9FA5]([\u4E00-\u9FA5]|[\s]){0,}[\d]+/g;
        let cnPlusDigits = newRow.match(cnPlusDigitReg);
        if (cnPlusDigits) {
            cnPlusDigits.forEach((cnPlusDigit) => {
                let cnReg = /[\u4E00-\u9FA5]([\u4E00-\u9FA5]|[\s]){0,}[\u4E00-\u9FA5]/g;
                let digitReg = /[\d]+/;
                let cns = cnPlusDigit.match(cnReg);
                let money = cnPlusDigit.match(digitReg)[0];
                cns.forEach((cn) => {
                    cn.split(' ').forEach((name) => {
                        rs.push({ name: name, money: money });
                    })
                });
            });
        }
    });
    //console.log(JSON.stringify(rs, null, 2));
    var stream = fs.createWriteStream("礼金.csv");
    stream.once('open', function(fd) {
        //excel requires utf-8 + BOM for csv file, otherwise chinese char could not be displayed
        stream.write(new Buffer('\xEF\xBB\xBF', 'binary'));
        rs.forEach((item) => {
            stream.write('"' + item.name + '","' + item.money + '"\n');
        });
        stream.end();
        console.log('file Saved');
    });

});
