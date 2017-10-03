#!/usr/bin/env node
const ItemService = require('../src/item');


const criterias = [
    {
        float: {
            min: 0.15,
            max: 0.17
        }
    },
    {
        price:{
            max: 800
        }
    },
    {
        float:{
            min: 0.5,
            max: 0.6
        }, 
        price: {
            min: 1000,
            max: 2000
        }
    }
];

const itemService = new ItemService(criterias);
console.log(itemService.isGoodItem(0.16, 9000));
console.log(itemService.isGoodItem(0.9, 400));
console.log(itemService.isGoodItem(0.55, 1500));
console.log(itemService.isGoodItem(0.18, 1500));
console.log(itemService.isGoodItem(0.7, 1500));
console.log(itemService.isGoodItem(0.55, 2100));