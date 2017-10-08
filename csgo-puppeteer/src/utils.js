const play = require('./sound');

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
                msg += `${Utils.getLocaleDateTime()} -- 磨损值： ${floatInfo}, and 价格 : ${price} and 成本价: ${(price * 0.8).toFixed(2)} \n<br/>  检视链接：${item.asset.market_actions[0].link} \n<br/> `;
            }
        }
        return msg;
    }
    /**
     * play sound, send email to any number of email services
     */
    static notify(soundPath, targetUrl, emailSubject, msg, ...emailServices) {
        play(soundPath);
        msg += `...点击<a href="${targetUrl}" target="_blank">这里前往</a><br/>`;
        // let's notify user
        emailServices.forEach((emailService) => emailService.sendEmail(emailSubject, msg));
    }

    static getCookieString(cookies) {
        return cookies.reduce((str, cookie) => str + `${cookie.name}=${cookie.value};`, '');
    }
}

module.exports = Utils;