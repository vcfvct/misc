const axios = require('axios');

class ItemService {
    getInspectUrl(itemInfo) {
        const linkTemplate = itemInfo.asset.market_actions[0].link;
        const paramA = itemInfo.asset.id;
        const paramM = itemInfo.listingid;
        return linkTemplate.replace('%listingid%', paramM).replace('%assetid%', paramA);
    }

    getQueryUrl(itemInfo) {
        const linkTemplate = itemInfo.asset.market_actions[0].link;
        const indexOfD = linkTemplate.lastIndexOf('D');
        const paramD = linkTemplate.substring(indexOfD + 1);
        const paramA = itemInfo.asset.id;
        const paramM = itemInfo.listingid;
        return `https://api.csgofloat.com:1738/?m=${paramM}&a=${paramA}&d=${paramD}`;
    }

    async getFloat(itemInfo) {
        const queryUrl = this.getQueryUrl(itemInfo);
        const floatHolder = await axios.get(queryUrl);
        return floatHolder.data.iteminfo.floatvalue;
    }

    getPrice(itemInfo) {
        return (itemInfo.converted_price + itemInfo.converted_fee) / 100;
    }

    isGoodItem(float, price, criterias) {
        let result = false;
        if (criterias.length) {
            for (let criteria of criterias) {
                if (this.isInRange(criteria.price, price) && this.isInRange(criteria.float, float)) {
                    result = true;
                    break;
                }
            }
        } else {
            result = true;
        }

        return result;
    }

    isInRange(objectMinMax, number) {
        if (!objectMinMax || !number) {
            return true;
        }
        const min = objectMinMax.min ? objectMinMax.min : -1;
        const max = objectMinMax.max ? objectMinMax.max : 1000000;
        return number >= min && number <= max;
    }
}

module.exports = ItemService;