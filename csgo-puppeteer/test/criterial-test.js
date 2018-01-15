#!/usr/bin/env node
const ItemService = require('../src/item');

const criterias = [
    {
        paintIndexes: [359, 393, 602, 649, 701]
    },
    {
        float: {
            min: 0.15,
            max: 0.17
        }
    },
    {
        price: {
            max: 800
        }
    },
    {
        float: {
            min: 0.5,
            max: 0.6
        },
        price: {
            min: 1000,
            max: 2000
        }
    },

];

console.log(ItemService.isGoodItem(criterias, undefined, undefined));
console.log(ItemService.isGoodItem(criterias, 0.16, 9000));
console.log(ItemService.isGoodItem(criterias, 0.9, 400));
console.log(ItemService.isGoodItem(criterias, 0.55, 1500));
console.log(ItemService.isGoodItem(criterias, undefined, undefined, 359));
console.log(ItemService.isGoodItem(criterias, 0.18, 1500));
console.log(ItemService.isGoodItem(criterias, 0.7, 1500));
console.log(ItemService.isGoodItem(criterias, 0.55, 2100));

