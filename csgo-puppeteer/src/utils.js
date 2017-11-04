const play = require('./sound');
const config = require('./config');

class Utils {
    static randomIntFromInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    static getLocaleDateTime() {
        return new Date().toLocaleString();
    }

    static calcNewItems(newList, oldList) {
        const result = [];
        if (oldList) {
            const newListIds = Object.keys(newList);
            newListIds.forEach((oldId) => {
                if (!oldList[oldId]) {
                    result.push(newList[oldId]);
                }
            });
        }
        return result;
    }

    static async getNotifyMsg(newItems, itemService, criterias) {
        let msg = '';
        for (let item of newItems) {
            const floatInfo = await itemService.getFloat(item);
            const price = itemService.getPrice(item);
            if (itemService.isGoodItem(floatInfo, price, criterias)) {
                msg += `${Utils.getLocaleDateTime()} -- 磨损值： ${floatInfo}, 价格 : ${price}, 成本: ${(price * 0.8).toFixed(2)} \n<br/> `;
                msg += `检视链接(双击全选）: \n<br/> ${itemService.getInspectUrl(item)} \n<br/>`;
            }
        }
        return msg;
    }
    /**
     * play sound, send email to any number of email services
     */
    static notify(soundPath, emailSubject, msg, ...emailServices) {
        play(soundPath);
        // let's notify user
        emailServices.forEach((emailService) => emailService.sendEmail(emailSubject, msg));
    }

    static getCookieString(cookies) {
        return cookies.reduce((str, cookie) => str + `${cookie.name}=${cookie.value};`, '');
    }

    /**
     * returns a promise of mongo DB instance.
     */
    static async getMongoDB() {
        const mongoClient = require('mongodb').MongoClient;
        const url = 'mongodb://csgo:csgo@ds137261.mlab.com:37261/hymn';
        return mongoClient.connect(url);
    }
}

module.exports = Utils;

// static async function login(page) {
//     await page.click('a.global_action_link');
//     await page.waitForSelector('input#steamAccountName');
//     await page.focus('#steamAccountName');
//     await page.type('MYACC');
//     await page.focus('#steamPassword');
//     await page.type('MYPW');
//     return await page.click('input[type="submit"]');
// } 