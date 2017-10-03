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

    isGoodItem(float, price, criterials){
        let result = false;
        if(criterials.length){
            for(let criterial of criterials){
               if(this.isInRange(criterial.price, price) && this.isInRange(criterial.float, float)){
                   result = true;
                   break;
               } 
            }
        }else{
            result = true;
        }

        return result;
    }

    isInRange(objectMinMax, number){
        if(!objectMinMax || !number){
            return true;
        }
        const min = objectMinMax.min ? objectMinMax.min : -1;
        const max = objectMinMax.max ? objectMinMax.max : 1000000;
        return number >= min && number <= max; 
    }
}


module.exports = ItemService;