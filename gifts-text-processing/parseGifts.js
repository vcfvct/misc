#!/usr/bin/env node

var fs = require('fs');
let rs = [];
fs.readFile('sample.txt', function(err, data) {
    if (err) throw err;
    var rows = data.toString().split("\n");
    rows.forEach((row) => {
        //some names, he input many spaces, need to shrink them. 
        let newRow = row.replace(/ {2,}/g, '');
        //get the chinese + [space] + number by regex
        let cnPlusDigitReg = /[\u4E00-\u9FA5]([\u4E00-\u9FA5]|[\s]){0,}[\d]+/g;
        let cnPlusDigits = newRow.match(cnPlusDigitReg);
        if (cnPlusDigits) {
            //handle each chinese name with gift number combination
            cnPlusDigits.forEach((cnPlusDigit) => {
                let cnReg = /[\u4E00-\u9FA5]([\u4E00-\u9FA5]|[\s]){0,}[\u4E00-\u9FA5]/g;
                let digitReg = /[\d]+/;
                //get the chinese names out
                let cns = cnPlusDigit.match(cnReg)[0];
                //get the gift number
                let money = cnPlusDigit.match(digitReg)[0];
                //each chinese string, he might entered multiple names, need to separate them here.
                cns.split(' ').forEach((name) => {
                    rs.push({ name: name, money: money });
                });
            });
        }
    });
    //console.log(JSON.stringify(rs, null, 2));
    //Now we start producing the target CSV file
    var stream = fs.createWriteStream("礼金.csv");
    stream.once('open', function(fd) {
        //excel requires utf-8 + BOM for csv file, otherwise chinese char could not be displayed
        stream.write(new Buffer('\xEF\xBB\xBF', 'binary'));
        //write Header
        stream.write('"Name","Amount"\n');
        //write records
        rs.forEach((item) => {
            stream.write('"' + item.name + '","' + item.money + '"\n');
        });
        stream.end();
        console.log('file Saved');
    });

});
