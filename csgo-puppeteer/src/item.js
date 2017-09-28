const axios = require('axios');

class ItemService {
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

    getPrice (itemInfo) {
        return (itemInfo.converted_price + itemInfo.converted_fee) / 100;
    }
}

module.exports = ItemService;