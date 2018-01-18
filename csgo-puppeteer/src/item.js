const axios = require('axios');

class ItemService {
    static getInspectUrl(itemInfo) {
        const linkTemplate = itemInfo.asset.market_actions[0].link;
        const paramA = itemInfo.asset.id;
        const paramM = itemInfo.listingid;
        return linkTemplate.replace('%listingid%', paramM).replace('%assetid%', paramA);
    }

    static getQueryUrl(itemInfo) {
        const linkTemplate = itemInfo.asset.market_actions[0].link;
        const indexOfD = linkTemplate.lastIndexOf('D');
        const paramD = linkTemplate.substring(indexOfD + 1);
        const paramA = itemInfo.asset.id;
        const paramM = itemInfo.listingid;
        return `https://api.csgofloat.com:1738/?m=${paramM}&a=${paramA}&d=${paramD}`;
    }

    static async getItemDetail(itemInfo) {
        const queryUrl = ItemService.getQueryUrl(itemInfo);
        const floatHolder = await axios.get(queryUrl);
        return floatHolder.data.iteminfo;
    }

    static getFloat(itemDetail) {
        return itemDetail.floatvalue;
    }

    static getPaintIndex(itemDetail) {
        return itemDetail.paintindex;
    }

    static getPaintSeed(itemDetail) {
        return itemDetail.paintseed;
    }

    static getPrice(itemInfo) {
        return (itemInfo.converted_price + itemInfo.converted_fee) / 100;
    }

    static isGoodItem(criterias, float, price, paintIndex, paintSeed) {
        let result = false;
        if (criterias.length) {
            for (let criteria of criterias) {
                if (ItemService.isInRange(criteria.price, price) &&
                    ItemService.isInRange(criteria.float, float) &&
                    ItemService.isInCriteriaArray(criteria.paintIndexes, paintIndex) &&
                    ItemService.isInCriteriaArray(criteria.paintSeeds, paintSeed)) {
                    result = true;
                    break;
                }
            }
        } else {
            result = true;
        }

        return result;
    }

    static isInCriteriaArray(array, element) {
        if (!array || !array.length) {
            return true;
        }
        return array.includes(element);
    }

    static isInRange(objectMinMax, number) {
        if (!objectMinMax) {
            return true;
        }
        const min = objectMinMax.min ? objectMinMax.min : -1;
        const max = objectMinMax.max ? objectMinMax.max : 1000000;
        return number >= min && number <= max;
    }
}

module.exports = ItemService;